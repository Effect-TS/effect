import { pipe } from "../../Function"
import type * as RM from "../../Managed/ReleaseMap"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

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
                        T.map(([_, __]) => __),
                        T.provideSome((r: R) => [r, finalizer] as [R, RM.ReleaseMap]),
                        restore,
                        T.onError(() => doneRef.set(true))
                      )
                    ),
                    T.tap(() => doneRef.set(true)),
                    T.map(({ a }) => [a]),
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
