import * as Map from "../../collection/immutable/Map"
import { Tuple } from "../../collection/immutable/Tuple"
import { matchTag_ } from "../../data/Utils"
import { Synchronized } from "../../io/Ref/Synchronized"
import { Effect } from "../Effect"
import type { IO, UIO } from "../Effect/definition/base"
import { ExecutionStrategy } from "../ExecutionStrategy"
import type { Exit } from "../Exit"
import { FiberRef } from "../FiberRef"
import { Managed } from "../Managed/definition"
import { ReleaseMap } from "../Managed/ReleaseMap"
import type { Finalizer } from "../Managed/ReleaseMap/finalizer"
import { noopFinalizer } from "../Managed/ReleaseMap/finalizer"
import { Promise } from "../Promise"
import type { Layer } from "./definition"
import { instruction, LayerHashSym } from "./definition"

/**
 * A `MemoMap` memoizes layers.
 */
export class MemoMap {
  constructor(
    readonly ref: Synchronized<Map.Map<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>>
  ) {}

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map, and
   * adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize<R, E, A>(layer: Layer<R, E, A>): Managed<R, E, A> {
    return Managed(
      this.ref
        .modifyEffect((m) => {
          const inMap = Map.lookup_(m, layer[LayerHashSym].get)

          switch (inMap._tag) {
            case "Some": {
              const {
                tuple: [acquire, release]
              } = inMap.value

              const cached = FiberRef.currentReleaseMap.value
                .get()
                .flatMap((releaseMap) =>
                  (acquire as IO<E, A>)
                    .onExit((exit) => {
                      switch (exit._tag) {
                        case "Success": {
                          return releaseMap.add(release)
                        }
                        case "Failure": {
                          return Effect.unit
                        }
                      }
                    })
                    .map((x) => Tuple(release, x))
                )

              return Effect.succeedNow(Tuple(cached, m))
            }
            case "None": {
              return Effect.Do()
                .bind("observers", () => Synchronized.make(0))
                .bind("promise", () => Promise.make<E, A>())
                .bind("finalizerRef", () =>
                  Synchronized.make<Finalizer>(() => noopFinalizer)
                )
                .bindValue("resource", ({ finalizerRef, observers, promise }) =>
                  Effect.uninterruptibleMask(({ restore }) =>
                    Effect.Do()
                      .bind("outerReleaseMap", () =>
                        FiberRef.currentReleaseMap.value.get()
                      )
                      .bind("innerReleaseMap", () => ReleaseMap.make)
                      .bind("tp", ({ innerReleaseMap, outerReleaseMap }) =>
                        restore(
                          scope(layer)
                            .flatMap((_) => _(this))
                            .effect.apply(
                              FiberRef.currentReleaseMap.value.locally(innerReleaseMap)
                            )
                        )
                          .exit()
                          .flatMap((exit) => {
                            switch (exit._tag) {
                              case "Failure": {
                                return (
                                  promise
                                    .failCause(exit.cause)
                                    .flatMap(() =>
                                      innerReleaseMap.releaseAll(
                                        exit,
                                        ExecutionStrategy.Sequential
                                      )
                                    ) > Effect.failCause(exit.cause)
                                )
                              }
                              case "Success": {
                                return Effect.Do()
                                  .tap(() =>
                                    finalizerRef.set((exit) =>
                                      Effect.whenEffect(
                                        observers.modify((n) => Tuple(n === 1, n - 1)),
                                        innerReleaseMap.releaseAll(
                                          exit,
                                          ExecutionStrategy.Sequential
                                        )
                                      )
                                    )
                                  )
                                  .tap(() => observers.update((n) => n + 1))
                                  .bind("outerFinalizer", () =>
                                    outerReleaseMap.add((e) =>
                                      finalizerRef.get().flatMap((_) => _(e))
                                    )
                                  )
                                  .tap(() => promise.succeed(exit.value.get(1)))
                                  .map(({ outerFinalizer }) =>
                                    Tuple(outerFinalizer, exit.value.get(1))
                                  )
                              }
                            }
                          })
                      )
                      .map(({ tp }) => tp)
                  )
                )
                .bindValue("memoized", ({ finalizerRef, observers, promise }) =>
                  Tuple(
                    (promise.await() as IO<E, A>).onExit((exit) => {
                      switch (exit._tag) {
                        case "Failure": {
                          return Effect.unit
                        }
                        case "Success": {
                          return observers.update((n) => n + 1)
                        }
                      }
                    }),
                    (e: Exit<any, any>) => finalizerRef.get().flatMap((_) => _(e))
                  )
                )
                .map(({ memoized, resource }) =>
                  Tuple(
                    resource,
                    layer.isFresh()
                      ? m
                      : Map.insert_(m, layer[LayerHashSym].get, memoized)
                  )
                )
            }
          }
        })
        .flatten()
    )
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): UIO<MemoMap> {
  return Synchronized.make<ReadonlyMap<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>>(
    Map.empty
  ).flatMap((r) => Effect.succeed(new MemoMap(r)))
}

/**
 * Builds a layer into a managed value.
 *
 * @tsplus fluent ets/Layer build
 */
export function build<R, E, A>(
  self: Layer<R, E, A>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed.Do()
    .bind("memoMap", () => Managed.fromEffect(makeMemoMap()))
    .bind("run", () => scope(self))
    .flatMap(({ memoMap, run }) => run(memoMap))
}

/**
 * @tsplus fluent ets/Layer scope
 */
export function scope<R, E, A>(
  self: Layer<R, E, A>,
  __tsplusTrace?: string
): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  return matchTag_(instruction(self), {
    LayerFold: (_) =>
      Managed.succeed(
        () => (memoMap: MemoMap) =>
          memoMap.getOrElseMemoize(_.self).foldCauseManaged(
            (e) => memoMap.getOrElseMemoize(_.failure(e)),
            (r) => memoMap.getOrElseMemoize(_.success(r))
          )
      ),
    LayerFresh: (_) => Managed.succeed(() => () => build(_.self)),
    LayerManaged: (_) => Managed.succeed(() => () => _.self),
    LayerSuspend: (_) =>
      Managed.succeed(() => (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self())),
    LayerTo: (_) =>
      Managed.succeed(
        () => (memoMap: MemoMap) =>
          memoMap
            .getOrElseMemoize(_.self)
            .flatMap((r) => memoMap.getOrElseMemoize(_.that).provideEnvironment(r))
      ),
    LayerZipWith: (_) =>
      Managed.succeed(
        () => (memoMap: MemoMap) =>
          memoMap
            .getOrElseMemoize(_.self)
            .zipWith(memoMap.getOrElseMemoize(_.that), _.f)
      ),
    LayerZipWithPar: (_) =>
      Managed.succeed(
        () => (memoMap: MemoMap) =>
          memoMap
            .getOrElseMemoize(_.self)
            .zipWithPar(memoMap.getOrElseMemoize(_.that), _.f)
      )
  })
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 *
 * @tsplus fluent ets/Layer isFresh
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh"
}
