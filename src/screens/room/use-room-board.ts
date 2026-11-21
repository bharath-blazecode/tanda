// CARD 9. Wires the pure poller to React and the page's visibility.
import { useEffect, useReducer } from 'react'
import { fetchRoom } from '../../api/room'
import { createPoller, initialBoard, reduceBoard, type Board } from './board'

export function useRoomBoard(): Board {
  const [board, dispatch] = useReducer(reduceBoard, initialBoard)

  useEffect(() => {
    const poller = createPoller({
      fetchRoom,
      onResult: dispatch,
      isHidden: () => document.visibilityState === 'hidden',
    })
    const onVisibility = () => poller.visibilityChanged()
    document.addEventListener('visibilitychange', onVisibility)
    poller.start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      poller.stop()
    }
  }, [])

  return board
}
