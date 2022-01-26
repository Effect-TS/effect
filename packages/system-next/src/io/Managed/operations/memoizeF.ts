import * as Map from "../../../collection/immutable/Map"
import * as Tp from "../../../collection/immutable/Tuple"
import { pipe } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { Promise } from "../../Promise/definition"
import { await as promiseAwait } from "../../Promise/operations/await"
import { unsafeMake as promiseUnsafeMake } from "../../Promise/operations/unsafeMake"
import { make as refMake } from "../../Ref/operations/make"
import { modify_ as refModify_ } from "../../Ref/operations/modify"
import { Managed } from "../definition"

/**
 * Returns a memoized version of the specified resourceful function in the
 * context of a managed scope. Each time the memoized function is evaluated a
 * new resource will be acquired, if the function has not already been
 * evaluated with that input, or else the previously acquired resource will be
 * returned. All resources acquired by evaluating the function will be
 * released at the end of the scope.
 *
 * @ets static ets/ManagedOps memoizeF
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
): Managed<unknown, never, (a: A) => Effect<R, E, B>> {
  return pipe(
    Managed.Do()
      .bind("fiberId", () => Managed.fiberId)
      .bind("ref", () =>
        Managed.fromEffect(refMake<Map.Map<A, Promise<E, B>>>(Map.empty))
      )
      .bind("scope", () => Managed.scope)
      .map(
        ({ fiberId, ref, scope }) =>
          (a: A): Effect<R, E, B> =>
            refModify_(ref, (map) => {
              const result = Map.lookup_(map, a)
              switch (result._tag) {
                case "Some": {
                  return Tp.tuple(promiseAwait(result.value), map)
                }
                case "None": {
                  const promise = promiseUnsafeMake<E, B>(fiberId)
                  return Tp.tuple(
                    scope(f(a))
                      .map((_) => _.get(1))
                      .intoPromise(promise)
                      .flatMap(() => promiseAwait(promise)),
                    Map.insert_(map, a, promise)
                  )
                }
              }
            }).flatten()
      )
  )
}
