import { eqStrict } from "../../Eq"
import { pipe } from "../../Function"
import * as M from "../../Map"
import { sequential } from "../Effect/ExecutionStrategy"
import { Exit } from "../Exit"
import { has, HasType } from "../Has"
import { Managed, noop } from "../Managed/managed"
import { Finalizer, ReleaseMap, makeReleaseMap } from "../Managed/releaseMap"
import * as P from "../Promise"
import * as R from "../Ref"
import * as RM from "../RefM"

import { Layer } from "./Layer"
import * as T from "./deps"

/**
 * A `MemoMap` memoizes dependencies.
 */

export class MemoMap {
  constructor(
    readonly ref: RM.RefM<
      M.Map<Layer<any, any, any, any>, [T.AsyncE<any, any>, Finalizer]>
    >
  ) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <S, R, E, A>(layer: Layer<S, R, E, A>) =>
    new Managed<unknown, R, E, A>(
      pipe(
        this.ref,
        RM.modify((m) => {
          const inMap = m.get(layer)

          if (inMap) {
            const [acquire, release] = inMap

            const cached = T.accessM(([_, rm]: [R, ReleaseMap]) =>
              pipe(
                acquire as T.AsyncE<E, A>,
                T.onExit((ex) => {
                  switch (ex._tag) {
                    case "Success": {
                      return rm.add(release)
                    }
                    case "Failure": {
                      return T.unit
                    }
                  }
                }),
                T.map((x) => [release, x] as [Finalizer, A])
              )
            )

            return T.succeedNow([cached, m])
          } else {
            return pipe(
              T.of,
              T.bind("observers", () => R.makeRef(0)),
              T.bind("promise", () => P.make<E, A>()),
              T.bind("finalizerRef", () => R.makeRef<Finalizer>(noop)),
              T.let("resource", ({ finalizerRef, observers, promise }) =>
                T.uninterruptibleMask(({ restore }) =>
                  pipe(
                    T.of,
                    T.bind("env", () => T.environment<[R, ReleaseMap]>()),
                    T.let("a", ({ env: [a] }) => a),
                    T.let(
                      "outerReleaseMap",
                      ({ env: [_, outerReleaseMap] }) => outerReleaseMap
                    ),
                    T.bind("innerReleaseMap", () => makeReleaseMap),
                    T.bind("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          T.provideAll_(layer.build.effect, [a, innerReleaseMap]),
                          T.result,
                          T.chain((e) => {
                            switch (e._tag) {
                              case "Failure": {
                                return pipe(
                                  promise,
                                  P.halt(e.cause),
                                  T.chain(
                                    () =>
                                      innerReleaseMap.releaseAll(
                                        e,
                                        sequential
                                      ) as T.AsyncE<E, any>
                                  ),
                                  T.chain(() => T.halt(e.cause))
                                )
                              }
                              case "Success": {
                                return pipe(
                                  T.of,
                                  T.tap(() =>
                                    finalizerRef.set((e) =>
                                      T.whenM(
                                        pipe(
                                          observers,
                                          R.modify((n) => [n === 1, n - 1])
                                        )
                                      )(
                                        innerReleaseMap.releaseAll(
                                          e,
                                          sequential
                                        ) as T.AsyncE<E, any>
                                      )
                                    )
                                  ),
                                  T.tap(() =>
                                    pipe(
                                      observers,
                                      R.update((n) => n + 1)
                                    )
                                  ),
                                  T.bind("outerFinalizer", () =>
                                    outerReleaseMap.add((e) =>
                                      T.chain_(finalizerRef.get, (f) => f(e))
                                    )
                                  ),
                                  T.tap(() => pipe(promise, P.succeed(e.value[1]))),
                                  T.map(
                                    ({ outerFinalizer }) =>
                                      [outerFinalizer, e.value[1]] as [Finalizer, A]
                                  )
                                )
                              }
                            }
                          })
                        )
                      )
                    ),
                    T.map(({ tp }) => tp)
                  )
                )
              ),
              T.let(
                "memoized",
                ({ finalizerRef, observers, promise }) =>
                  [
                    pipe(
                      promise,
                      P.wait,
                      T.onExit((e) => {
                        switch (e._tag) {
                          case "Failure": {
                            return T.unit
                          }
                          case "Success": {
                            return pipe(
                              observers,
                              R.update((n) => n + 1)
                            )
                          }
                        }
                      })
                    ),
                    (e: Exit<any, any>) => T.chain_(finalizerRef.get, (f) => f(e))
                  ] as [T.AsyncE<any, any>, Finalizer]
              ),
              T.map(({ memoized, resource }) => [
                resource as T.Effect<unknown, [R, ReleaseMap], E, [Finalizer, A]>,
                M.insertAt_(eqStrict)(m, layer, memoized) as M.Map<
                  Layer<any, any, any, any>,
                  [T.AsyncE<any, any>, Finalizer]
                >
              ])
            )
          }
        }),
        T.flatten
      )
    )
}

export const HasMemoMap = has(MemoMap)
export type HasMemoMap = HasType<typeof HasMemoMap>
