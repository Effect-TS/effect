import * as A from "../../Array"
import { flow, pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export function iterate<A>(a: A, f: (a: A) => A): UIO<A> {
  return new Stream(
    pipe(
      Ref.makeRef(a),
      T.toManaged(),
      M.map(flow(Ref.getAndUpdate(f), T.map(A.single)))
    )
  )
}
