import { AtomicNumber } from "../../Support/AtomicNumber"
import type { FiberId } from "../definition"
import { Runtime } from "../definition"

const _fiberCounter = new AtomicNumber(0)

export function make(id: number, startTimeSeconds: number): FiberId {
  return new Runtime(id, startTimeSeconds)
}

export function unsafeMake(): Runtime {
  return new Runtime(
    _fiberCounter.getAndIncrement(),
    Math.floor(new Date().getTime() / 1000)
  )
}
