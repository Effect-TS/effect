import * as Map from "../../collection/immutable/Map"
import { Tuple } from "../../collection/immutable/Tuple"
import type { LazyArg } from "../../data/Function"
import { constant } from "../../data/Function"
import { matchTag_ } from "../../data/Utils"
import { SynchronizedRef } from "../../io/Ref/Synchronized"
import { Effect } from "../Effect"
import type { IO, UIO } from "../Effect/definition/base"
import type { Exit } from "../Exit"
import { Promise } from "../Promise"
import type { Finalizer } from "../Scope"
import { HasScope, Scope } from "../Scope"
import type { Layer } from "./definition"
import { instruction, LayerHashSym } from "./definition"

/**
 * A `MemoMap` memoizes layers.
 */
export class MemoMap {
  constructor(
    readonly ref: SynchronizedRef<
      Map.Map<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>
    >
  ) {}

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map,
   * and adds a finalizer to the `Scope`.
   */
  getOrElseMemoize<RIn, E, ROut>(
    layer: Layer<RIn, E, ROut>,
    scope: Scope
  ): Effect<RIn, E, ROut> {
    return this.ref
      .modifyEffect((map) => {
        const inMap = Map.lookup_(map, layer[LayerHashSym].get)

        switch (inMap._tag) {
          case "Some": {
            const {
              tuple: [acquire, release]
            } = inMap.value

            const cached: Effect<unknown, E, ROut> = acquire.onExit((exit) =>
              exit.fold(
                () => Effect.unit,
                () => scope.addFinalizerExit(release)
              )
            )

            return Effect.succeed(Tuple(cached, map))
          }
          case "None": {
            return Effect.Do()
              .bind("observers", () => SynchronizedRef.make(0))
              .bind("promise", () => Promise.make<E, ROut>())
              .bind("finalizerRef", () =>
                SynchronizedRef.make<Finalizer>(() => constant(Effect.unit))
              )
              .bindValue("resource", ({ finalizerRef, observers, promise }) =>
                Effect.uninterruptibleMask(({ restore }) =>
                  Effect.Do()
                    .bindValue("outerScope", () => scope)
                    .bind("innerScope", () => Scope.make)
                    .flatMap(({ innerScope, outerScope }) =>
                      restore(layer.withScope(innerScope).flatMap((f) => f(this)))
                        .exit()
                        .flatMap((exit) => {
                          switch (exit._tag) {
                            case "Failure": {
                              return (
                                promise.failCause(exit.cause) >
                                innerScope.close(exit) >
                                Effect.failCause(exit.cause)
                              )
                            }
                            case "Success": {
                              return (
                                finalizerRef.set((exit) =>
                                  Effect.whenEffect(
                                    observers.modify((n) => Tuple(n === 1, n - 1)),
                                    innerScope.close(exit)
                                  )
                                ) >
                                observers.update((n) => n + 1) >
                                outerScope.addFinalizerExit((e) =>
                                  finalizerRef.get.flatMap((fin) => fin(e))
                                ) >
                                promise.succeed(exit.value)
                              ).as(exit.value)
                            }
                          }
                        })
                    )
                )
              )
              .bindValue("memoized", ({ finalizerRef, observers, promise }) =>
                Tuple(
                  promise.await().onExit((exit) =>
                    exit.fold(
                      () => Effect.unit,
                      () => observers.update((n) => n + 1)
                    )
                  ),
                  (e: Exit<unknown, unknown>) =>
                    finalizerRef.get.flatMap((fin) => fin(e))
                )
              )
              .map(({ memoized, resource }) =>
                Tuple(
                  resource,
                  layer.isFresh()
                    ? map
                    : Map.insert_(map, layer[LayerHashSym].get, memoized)
                )
              )
          }
        }
      })
      .flatten()
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): UIO<MemoMap> {
  return SynchronizedRef.make<
    ReadonlyMap<PropertyKey, Tuple<[IO<any, any>, Finalizer]>>
  >(Map.empty).flatMap((r) => Effect.succeed(new MemoMap(r)))
}

/**
 * Builds a layer into a scoped value.
 *
 * @tsplus fluent ets/Layer build
 */
export function build<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  __tsplusTrace?: string
): Effect<RIn & HasScope, E, ROut> {
  return Effect.serviceWithEffect(HasScope)((scope) => self.buildWithScope(scope))
}

/**
 * Builds a layer into an Effect value. Any resources associated with this layer
 * will be released when the specified scope is closed unless their scope has
 * been extended. This allows building layers where the lifetime of some of
 * the services output by the layer exceed the lifetime of the effect the
 * layer is provided to.
 *
 * @tsplus fluent ets/Layer buildWithScope
 */
export function buildWithScope<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
): Effect<RIn, E, ROut> {
  return Effect.Do()
    .bind("memoMap", () => makeMemoMap())
    .bind("run", () => self.withScope(scope))
    .flatMap(({ memoMap, run }) => run(memoMap))
}

/**
 * @tsplus fluent ets/Layer withScope
 */
export function withScope<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
): Effect<unknown, never, (_: MemoMap) => Effect<RIn, E, ROut>> {
  return Effect.succeed(scope).flatMap((scope) =>
    matchTag_(instruction(self), {
      LayerExtendScope: (_) =>
        Effect.succeed(
          () => (memoMap: MemoMap) =>
            Effect.scopeWith((scope) => memoMap.getOrElseMemoize(_.self, scope))
        ),
      LayerFold: (_) =>
        Effect.succeed(
          () => (memoMap: MemoMap) =>
            memoMap.getOrElseMemoize(_.self, scope).foldCauseEffect(
              (e) => memoMap.getOrElseMemoize(_.failure(e), scope),
              (r) => memoMap.getOrElseMemoize(_.success(r), scope)
            )
        ),
      LayerFresh: (_) => Effect.succeed(() => () => _.self.buildWithScope(scope)),
      LayerScoped: (_) => Effect.succeed(() => () => scope.extend(_.self)),
      LayerSuspend: (_) =>
        Effect.succeed(
          () => (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self(), scope)
        ),
      LayerTo: (_) =>
        Effect.succeed(
          () => (memoMap: MemoMap) =>
            memoMap
              .getOrElseMemoize(_.self, scope)
              .flatMap((r) =>
                memoMap
                  .getOrElseMemoize(_.that, scope)
                  .provideEnvironment(r, __tsplusTrace)
              )
        ),
      LayerZipWithPar: (_) =>
        Effect.succeed(
          () => (memoMap: MemoMap) =>
            memoMap
              .getOrElseMemoize(_.self, scope)
              .zipWithPar(memoMap.getOrElseMemoize(_.that, scope), _.f)
        )
    })
  )
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 *
 * @tsplus fluent ets/Layer isFresh
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh"
}
