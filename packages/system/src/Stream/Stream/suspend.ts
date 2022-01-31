// ets_tracing: off

import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

export function suspend<R, E, A>(f: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.suspend(() => f().proc))
}
