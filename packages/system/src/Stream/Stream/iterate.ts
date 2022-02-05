// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import type { UIO } from "./definitions.js"
import { Stream } from "./definitions.js"

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export function iterate<A>(a: A, f: (a: A) => A): UIO<A> {
  return new Stream(
    pipe(
      Ref.makeRef(a),
      T.toManaged,
      M.map((x) => pipe(x, Ref.getAndUpdate(f), T.map(A.single)))
    )
  )
}
