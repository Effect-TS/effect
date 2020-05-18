import { Task } from "fp-ts/lib/Task"

import { Async } from "../Support/Common/effect"

import { fromPromise } from "./fromPromise"
import { orAbort } from "./orAbort"

export function encaseTask<A>(task: Task<A>): Async<A> {
  return orAbort(fromPromise(task))
}
