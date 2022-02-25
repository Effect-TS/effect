import * as Map from "../../collection/immutable/Map"
import { Tuple } from "../../collection/immutable/Tuple"
import { matchTag_ } from "../../data/Utils"
import * as Ref from "../../io/Ref/Synchronized"
import { Effect } from "../Effect"
import type { IO, UIO } from "../Effect/definition/base"
import { ExecutionStrategy } from "../ExecutionStrategy"
import type { Exit } from "../Exit"
import { currentReleaseMap } from "../FiberRef/definition/data"
import { get } from "../FiberRef/operations/get"
import { locally_ } from "../FiberRef/operations/locally"
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
    readonly ref: Ref.Synchronized<
      Map.Map<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>
    >
  ) {}

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map, and
   * adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize<R, E, A>(layer: Layer<R, E, A>): Managed<R, E, A> {
    return Managed(
      Ref.modifyEffect_(this.ref, (m) => {
        const inMap = Map.lookup_(m, layer[LayerHashSym].get)

        switch (inMap._tag) {
          case "Some": {
            const {
              tuple: [acquire, release]
            } = inMap.value

            const cached = get(currentReleaseMap.value).flatMap((releaseMap) =>
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
              .bind("observers", () => Ref.make(0))
              .bind("promise", () => Promise.make<E, A>())
              .bind("finalizerRef", () => Ref.make(noopFinalizer))
              .bindValue("resource", ({ finalizerRef, observers, promise }) =>
                Effect.uninterruptibleMask(({ restore }) =>
                  Effect.Do()
                    .bind("outerReleaseMap", () => get(currentReleaseMap.value))
                    .bind("innerReleaseMap", () => ReleaseMap.make)
                    .bind("tp", ({ innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        locally_(
                          currentReleaseMap.value,
                          innerReleaseMap
                        )(scope(layer).flatMap((_) => _(this)).effect)
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
                                  Ref.set_(finalizerRef, (exit) =>
                                    Effect.whenEffect(
                                      Ref.modify_(observers, (n) =>
                                        Tuple(n === 1, n - 1)
                                      ),
                                      innerReleaseMap.releaseAll(
                                        exit,
                                        ExecutionStrategy.Sequential
                                      )
                                    )
                                  )
                                )
                                .tap(() => Ref.update_(observers, (n) => n + 1))
                                .bind("outerFinalizer", () =>
                                  outerReleaseMap.add((e) =>
                                    Ref.get(finalizerRef).flatMap((_) => _(e))
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
                        return Ref.update_(observers, (n) => n + 1)
                      }
                    }
                  }),
                  (e: Exit<any, any>) => Ref.get(finalizerRef).flatMap((_) => _(e))
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
      }).flatten()
    )
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): UIO<MemoMap> {
  return Ref.make<ReadonlyMap<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>>(
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
