// The Redis side of the room mirror. Only server/room-mirror.ts uses it, and only when REDIS_URL is set.
// Every option here favours failing fast: a dead Redis must never slow or break a request.
import { Redis } from 'ioredis'
import { DEFAULT_MAX_AGE_MS } from './state'
import type { RoomMirror } from './room-mirror'

// One hash: field = deviceId, value = JSON of the RoomEntry. The suffix lets a new shape move aside.
export const ROOM_KEY = 'kachka:room:v1'

const CONNECT_TIMEOUT_MS = 1_000
const COMMAND_TIMEOUT_MS = 1_000
const READY_WAIT_MS = 1_500
const RETRY_CAP_MS = 2_000
const QUIT_WAIT_MS = 500

export function createRedisMirror(url: string, onError: (err: unknown) => void): RoomMirror {
  const client = new Redis(url, {
    // Without these, commands queue in memory while Redis is down and resolve minutes later.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: CONNECT_TIMEOUT_MS,
    commandTimeout: COMMAND_TIMEOUT_MS,
    // Keep trying in the background, at most every 2 seconds, so the mirror heals when Redis returns.
    retryStrategy: (times) => Math.min(times * 200, RETRY_CAP_MS),
  })
  // An unhandled 'error' event would crash Node. Count it instead; never log the URL (it has a password).
  client.on('error', onError)

  // With the offline queue off, a command sent before the first connect fails at once,
  // so reads at boot wait (briefly) for the connection to be ready.
  const whenReady = () =>
    new Promise<void>((resolve, reject) => {
      if (client.status === 'ready') return resolve()
      const onReady = () => {
        cleanup()
        resolve()
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(Object.assign(new Error('redis not ready'), { name: 'RedisNotReady' }))
      }, READY_WAIT_MS)
      timer.unref()
      const cleanup = () => {
        clearTimeout(timer)
        client.off('ready', onReady)
      }
      client.on('ready', onReady)
    })

  return {
    async readAll(maxFields) {
      await whenReady()
      // Inspect size on the Redis server before transferring values to Node.
      const raw = await client.eval(`
        if redis.call('HLEN', KEYS[1]) > tonumber(ARGV[1]) then return false end
        if redis.call('PTTL', KEYS[1]) == -1 then
          redis.call('PEXPIRE', KEYS[1], ARGV[2])
        end
        local result = {}
        for _, id in ipairs(redis.call('HKEYS', KEYS[1])) do
          if #id <= 256 and redis.call('HSTRLEN', KEYS[1], id) <= 1024 then
            table.insert(result, id)
            table.insert(result, redis.call('HGET', KEYS[1], id))
          else
            redis.call('HDEL', KEYS[1], id)
          end
        end
        return result
      `, 1, ROOM_KEY, maxFields, DEFAULT_MAX_AGE_MS) as string[] | null
      if (!raw) throw Object.assign(new Error('room mirror too large'), { name: 'MirrorTooLarge' })
      const entries: Record<string, string> = Object.create(null)
      for (let i = 0; i < raw.length; i += 2) entries[raw[i]] = raw[i + 1]
      return entries
    },
    async write(deviceId, value) {
      await client.eval(`
        redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
        return redis.call('PEXPIRE', KEYS[1], ARGV[3])
      `, 1, ROOM_KEY, deviceId, value, DEFAULT_MAX_AGE_MS)
    },
    async remove(deviceIds) {
      if (deviceIds.length > 0) await client.hdel(ROOM_KEY, ...deviceIds)
    },
    async clear() {
      await client.del(ROOM_KEY)
    },
    async close() {
      // quit() waits for Redis to answer; if it is down, cut the socket instead.
      const timer = new Promise<void>((resolve) => setTimeout(resolve, QUIT_WAIT_MS).unref())
      await Promise.race([client.quit().then(() => undefined, () => undefined), timer])
      client.disconnect()
    },
  }
}
