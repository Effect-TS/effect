import * as Map from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Promise } from "../../Promise"
import { SynchronizedRef } from "../../Ref/Synchronized"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @tsplus static ets/EffectOps memoize
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): UIO<(a: A) => Effect<R, E, B>> {
  return SynchronizedRef.make(Map.make<A, Promise<E, B>>([])).map(
    (ref) => (a: A) =>
      ref
        .modifyEffect((map) =>
          Map.lookup_(map, a).fold(
            Promise.make<E, B>()
              .tap((promise) => f(a).intoPromise(promise).fork())
              .map((promise) => Tuple(promise, Map.insert_(map, a, promise))),
            (promise) => Effect.succeedNow(Tuple(promise, map))
          )
        )
        .flatMap((promise) => promise.await())
  )
}
