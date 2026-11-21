// CARD 8 owns this file. Asks the server for the bird's line.
// Returns null on any failure: the caller keeps its canned line and shows no error (D12).
import { VerdictResponse, type VerdictRequest } from '../../shared/contracts'

const TIMEOUT_MS = 4000

export async function requestVerdictLine(body: VerdictRequest): Promise<VerdictResponse | null> {
  try {
    const res = await fetch('/api/verdict', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const parsed = VerdictResponse.safeParse(await res.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
