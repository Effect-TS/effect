import * as M from "../_internal/managed"
import { Stream } from "./definitions"

export function suspend<R, E, A>(f: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.suspend(() => f().proc))
}
