// ets_tracing: off

import * as Map from "../../Collections/Immutable/Map"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import type { Promise } from "../../Promise/definition"
import { await as awaitPromise } from "../../Promise/operations/await"
import { unsafeMake as unsafeMakePromise } from "../../Promise/operations/unsafeMake"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import * as Ref from "./_internal/ref"
import * as Do from "./do"
import { fromEffect } from "./fromEffect"
import { map } from "./map"
import { scope } from "./scope"

/**
 * Returns a memoized version of the specified resourceful function in the
 * context of a managed scope. Each time the memoized function is evaluated a
 * new resource will be acquired, if the function has not already been
 * evaluated with that input, or else the previously acquired resource will be
 * returned. All resources acquired by evaluating the function will be
 * released at the end of the scope.
 */
export function memoizeF<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<unknown, never, (a: A) => T.Effect<R, E, B>> {
  return pipe(
    Do.do,
    Do.bind("fiberId", () => fromEffect(T.fiberId)),
    Do.bind("ref", () => fromEffect(Ref.make<Map.Map<A, Promise<E, B>>>(Map.empty))),
    Do.bind("scope", () => scope),
    map(
      ({ fiberId, ref, scope }) =>
        (a: A): T.Effect<R, E, B> =>
          T.flatten(
            Ref.modify_(ref, (map) => {
              const result = Map.lookup_(map, a)
              switch (result._tag) {
                case "Some": {
                  return Tp.tuple(awaitPromise(result.value), map)
                }
                case "None": {
                  const promise = unsafeMakePromise<E, B>(fiberId)

                  return Tp.tuple(
                    pipe(
                      scope(f(a)),
                      T.map((_) => _.get(1)),
                      T.intoPromise(promise),
                      T.chain(() => awaitPromise(promise))
                    ),
                    Map.insert_(map, a, promise)
                  )
                }
              }
            })
          )
    )
  )
}
