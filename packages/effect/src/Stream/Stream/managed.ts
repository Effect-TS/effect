import { pipe } from "../../Function"
import { makeManagedReleaseMap } from "../../Managed"
import type { ReleaseMap } from "../../Managed/ReleaseMap"
import * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
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
      M.bind("finalizer", () => makeManagedReleaseMap(T.sequential)),
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
                        T.provideSome((r: R) => [r, finalizer] as [R, ReleaseMap]),
                        restore,
                        T.onError(() => doneRef.set(true))
                      )
                    ),
                    T.tap(() => doneRef.set(true)),
                    T.map(({ a }) => [a]),
                    T.mapError(Option.some)
                  )
            )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}
