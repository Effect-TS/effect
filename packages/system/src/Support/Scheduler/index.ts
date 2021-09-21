import type { Lazy } from "../../Function"
import { DoublyLinkedList } from "../DoublyLinkedList"

let isRunning = false
const tasks = new DoublyLinkedList<Lazy<void>>()

export const immediate: (thunk: Lazy<void>) => void =
  typeof setImmediate !== "undefined" ? setImmediate : (x) => setTimeout(x, 0)

export const defaultScheduler: (thunk: Lazy<void>) => void = (thunk) => {
  tasks.add(thunk)
  if (!isRunning) {
    isRunning = true
    immediate(() => {
      while (tasks.length > 0) {
        tasks.shift()!()
      }
      isRunning = false
    })
  }
}
