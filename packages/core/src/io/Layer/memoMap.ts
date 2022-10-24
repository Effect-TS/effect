import { instruction } from "@effect/core/io/Layer/definition"
import type { Context } from "@fp-ts/data/Context"
import { constant } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * A `MemoMap` memoizes layers.
 *
 * @category model
 * @since 1.0.0
 */
export class MemoMap {
  constructor(
    readonly ref: Ref.Synchronized<
      Map<Layer<any, any, any>, readonly [Effect<never, any, any>, Scope.Finalizer]>
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
  ): Effect<RIn, E, Context<ROut>> {
    return this.ref.modifyEffect((map) => {
      const inMap = Option.fromNullable(map.get(layer))
      switch (inMap._tag) {
        case "Some": {
          const [acquire, release] = inMap.value
          const cached: Effect<never, E, Context<ROut>> =
            (acquire as Effect<never, E, readonly [Context<ROut>, FiberRefs]>)
              .flatMap(([b, refs]) => Effect.inheritFiberRefs(refs).as(b))
              .onExit((exit) =>
                exit.fold(
                  () => Effect.unit,
                  () => scope.addFinalizerExit(release)
                )
              )
          return Effect.succeed([cached, map] as const)
        }
        case "None": {
          return Do(($) => {
            const observers = $(Ref.Synchronized.make(0))
            const deferred = $(Deferred.make<E, readonly [Context<ROut>, FiberRefs]>())
            const finalizerRef = $(
              Ref.Synchronized.make<Scope.Finalizer>(() => constant(Effect.unit))
            )
            const resource = Effect.uninterruptibleMask(({ restore }) =>
              Scope.make.flatMap((innerScope) =>
                restore(
                  layer.withScope(innerScope).flatMap((f) => f(this).zip(Effect.getFiberRefs))
                )
                  .exit
                  .flatMap((exit) => {
                    switch (exit._tag) {
                      case "Failure": {
                        return (
                          deferred.failCause(exit.cause)
                            .zipRight(innerScope.close(exit))
                            .zipRight(Effect.failCause(exit.cause))
                        )
                      }
                      case "Success": {
                        return finalizerRef.set((exit) =>
                          Effect.whenEffect(
                            observers.modify((n) => [n === 1, n - 1] as const),
                            innerScope.close(exit)
                          )
                        )
                          .zipRight(observers.update((n) => n + 1))
                          .zipRight(
                            scope.addFinalizerExit((e) => finalizerRef.get.flatMap((fin) => fin(e)))
                          )
                          .zipRight(deferred.succeed(exit.value))
                          .as(exit.value[0])
                      }
                    }
                  })
              )
            )
            const memoized = [
              deferred
                .await
                .onExit((exit) =>
                  exit.fold(
                    () => Effect.unit,
                    () => observers.update((n) => n + 1)
                  )
                ),
              (e: Exit<unknown, unknown>) => finalizerRef.get.flatMap((fin) => fin(e))
            ] as const
            return [resource, layer.isFresh ? map : map.set(layer, memoized)] as const
          })
        }
      }
    }).flatten
  }
}

/**
 * Creates an empty `MemoMap`.
 *
 * @category constructors
 * @since 1.0.0
 */
export function makeMemoMap(): Effect<never, never, MemoMap> {
  return Ref.Synchronized.make<
    Map<Layer<any, any, any>, readonly [Effect<never, any, any>, Scope.Finalizer]>
  >(new Map()).flatMap((r) => Effect.sync(new MemoMap(r)))
}

/**
 * Builds a layer into a scoped value.
 *
 * @tsplus getter effect/core/io/Layer build
 * @category destructors
 * @since 1.0.0
 */
export function build<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Effect<RIn | Scope, E, Context<ROut>> {
  return Effect.serviceWithEffect(Scope.Tag, (scope) => self.buildWithScope(scope))
}

/**
 * Builds a layer into an Effect value. Any resources associated with this layer
 * will be released when the specified scope is closed unless their scope has
 * been extended. This allows building layers where the lifetime of some of
 * the services output by the layer exceed the lifetime of the effect the
 * layer is provided to.
 *
 * @tsplus static effect/core/io/Layer.Aspects buildWithScope
 * @tsplus pipeable effect/core/io/Layer buildWithScope
 * @category destructors
 * @since 1.0.0
 */
export function buildWithScope(scope: Scope) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Effect<RIn, E, Context<ROut>> =>
    Do(($) => {
      const memoMap = $(makeMemoMap())
      const run = $(self.withScope(scope))
      return $(run(memoMap))
    })
}

/**
 * @tsplus static effect/core/io/Layer.Aspects withScope
 * @tsplus pipeable effect/core/io/Layer withScope
 * @category destructors
 * @since 1.0.0
 */
export function withScope(scope: Scope) {
  return <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>
  ): Effect<never, never, (_: MemoMap) => Effect<RIn, E, Context<ROut>>> => {
    const I = instruction(self)
    switch (I._tag) {
      case "LayerApply": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (_: MemoMap) => I.self
        )
      }
      case "LayerExtendScope": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>((memoMap: MemoMap) =>
          Effect.scopeWith((scope) => memoMap.getOrElseMemoize(I.self, scope))
        )
      }
      case "LayerFold": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap.getOrElseMemoize(I.self, scope).foldCauseEffect(
              (e) => memoMap.getOrElseMemoize(I.failure(e), scope),
              (r) => memoMap.getOrElseMemoize(I.success(r), scope)
            )
        )
      }
      case "LayerFresh": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (_: MemoMap) => I.self.buildWithScope(scope)
        )
      }
      case "LayerScoped": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (_: MemoMap) => scope.extend(I.self)
        )
      }
      case "LayerSuspend": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (memoMap: MemoMap) => memoMap.getOrElseMemoize(I.self(), scope)
        )
      }
      case "LayerTo": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap.getOrElseMemoize(I.self, scope).flatMap((r) =>
              memoMap.getOrElseMemoize(I.that, scope).provideEnvironment(r)
            )
        )
      }
      case "LayerZipWithPar": {
        return Effect.sync<(_: MemoMap) => Effect<RIn, E, Context<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap
              .getOrElseMemoize(I.self, scope)
              .zipWithPar(memoMap.getOrElseMemoize(I.that, scope), I.f)
        )
      }
    }
  }
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 *
 * @tsplus getter effect/core/io/Layer isFresh
 * @category getters
 * @since 1.0.0
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh"
}
