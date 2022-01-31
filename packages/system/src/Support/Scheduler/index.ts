// ets_tracing: off

import type { Lazy } from "../../Function/index.js"
import { DoublyLinkedList } from "../DoublyLinkedList/index.js"

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
