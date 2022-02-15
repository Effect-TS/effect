import type { Lazy } from "../data/Function"
import { DoublyLinkedList } from "./DoublyLinkedList"

let isRunning = false
const tasks = new DoublyLinkedList<Lazy<void>>()

export const defaultScheduler: (thunk: Lazy<void>) => void = (thunk) => {
  tasks.add(thunk)
  if (!isRunning) {
    isRunning = true
    Promise.resolve().then(() => {
      while (tasks.length > 0) {
        tasks.shift()!()
      }
      isRunning = false
    })
  }
}
