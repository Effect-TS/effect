// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"
/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(self: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("doneRef", () => Ref.makeManagedRef(false)),
      M.bind("finalizer", () => M.makeManagedReleaseMap(T.sequential)),
      M.let("pull", ({ doneRef, finalizer }) =>
        T.uninterruptibleMask(({ restore }) =>
          pipe(
            doneRef.get,
            T.chain((done) =>
              done
                ? Pull.end
                : pipe(
                    T.do,
                    T.bind("a", () =>
                      pipe(
                        self.effect,
                        T.map(({ tuple: [_, __] }) => __),
                        T.provideSome((r: R) => Tp.tuple(r, finalizer)),
                        restore,
                        T.onError(() => doneRef.set(true))
                      )
                    ),
                    T.tap(() => doneRef.set(true)),
                    T.map(({ a }) => A.single(a)),
                    T.mapError(O.some)
                  )
            )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}
