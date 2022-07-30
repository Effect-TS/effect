import { instruction } from "@effect/core/io/Layer/definition"
import { constant } from "@tsplus/stdlib/data/Function"

/**
 * A `MemoMap` memoizes layers.
 */
export class MemoMap {
  constructor(
    readonly ref: Ref.Synchronized<
      Map<Layer<any, any, any>, Tuple<[Effect.IO<any, any>, Scope.Finalizer]>>
    >
  ) {}

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map,
   * and adds a finalizer to the `Scope`.
   */
  getOrElseMemoize<RIn, E, ROut>(
    layer: Layer<RIn, E, ROut>,
    scope: LazyArg<Scope>
  ): Effect<RIn, E, Env<ROut>> {
    return Effect.sync(scope).flatMap((scope) =>
      this.ref.modifyEffect((map) => {
        const inMap = Maybe.fromNullable(map.get(layer))

        switch (inMap._tag) {
          case "Some": {
            const {
              tuple: [acquire, release]
            } = inMap.value

            const cached: Effect<never, E, Env<ROut>> = acquire.onExit((exit) =>
              exit.fold(
                () => Effect.unit,
                () => scope.addFinalizerExit(release)
              )
            )

            return Effect.sync(Tuple(cached, map))
          }
          case "None": {
            return Do(($) => {
              const observers = $(Ref.Synchronized.make(0))
              const deferred = $(Deferred.make<E, Env<ROut>>())
              const finalizerRef = $(Ref.Synchronized.make<Scope.Finalizer>(() => constant(Effect.unit)))
              const resource = Effect.uninterruptibleMask(({ restore }) =>
                Effect.Do()
                  .bindValue("outerScope", () => scope)
                  .bind("innerScope", () => Scope.make)
                  .flatMap(({ innerScope, outerScope }) =>
                    restore(layer.withScope(innerScope).flatMap((f) => f(this)))
                      .exit
                      .flatMap((exit) => {
                        switch (exit._tag) {
                          case "Failure": {
                            return (
                              deferred.failCause(exit.cause) >
                                innerScope.close(exit) >
                                Effect.failCauseSync(exit.cause)
                            )
                          }
                          case "Success": {
                            return finalizerRef.set((exit) =>
                              Effect.whenEffect(
                                observers.modify((n) => Tuple(n === 1, n - 1)),
                                innerScope.close(exit)
                              )
                            )
                              .zipRight(observers.update((n) => n + 1))
                              .zipRight(
                                outerScope.addFinalizerExit((e) => finalizerRef.get().flatMap((fin) => fin(e)))
                              )
                              .zipRight(deferred.succeed(exit.value))
                              .as(exit.value)
                          }
                        }
                      })
                  )
              )
              const memoized = Tuple(
                deferred
                  .await()
                  .onExit((exit) =>
                    exit.fold(
                      () => Effect.unit,
                      () => observers.update((n) => n + 1)
                    )
                  ),
                (e: Exit<unknown, unknown>) => finalizerRef.get().flatMap((fin) => fin(e))
              )
              return Tuple(resource, layer.isFresh ? map : map.set(layer, memoized))
            })
          }
        }
      }).flatten
    )
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): Effect<never, never, MemoMap> {
  return Ref.Synchronized.make<
    Map<Layer<any, any, any>, Tuple<[Effect.IO<any, any>, Scope.Finalizer]>>
  >(new Map()).flatMap((r) => Effect.sync(new MemoMap(r)))
}

/**
 * Builds a layer into a scoped value.
 *
 * @tsplus getter effect/core/io/Layer build
 */
export function build<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  __tsplusTrace?: string
): Effect<RIn | Scope, E, Env<ROut>> {
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
 */
export function buildWithScope(scope: LazyArg<Scope>, __tsplusTrace?: string) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Effect<RIn, E, Env<ROut>> =>
    Do(($) => {
      const memoMap = $(makeMemoMap())
      const run = $(self.withScope(scope))
      return $(run(memoMap))
    })
}

/**
 * @tsplus static effect/core/io/Layer.Aspects withScope
 * @tsplus pipeable effect/core/io/Layer withScope
 */
export function withScope(scope: LazyArg<Scope>, __tsplusTrace?: string) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Effect<never, never, (_: MemoMap) => Effect<RIn, E, Env<ROut>>> =>
    Match.tag(instruction(self), {
      LayerApply: (_) => Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>((memoMap: MemoMap) => _.self),
      LayerExtendScope: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>((memoMap: MemoMap) =>
          Effect.scopeWith((scope) => memoMap.getOrElseMemoize(_.self, scope))
        ),
      LayerFold: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap.getOrElseMemoize(_.self, scope).foldCauseEffect(
              (e) => memoMap.getOrElseMemoize(_.failure(e), scope),
              (r) => memoMap.getOrElseMemoize(_.success(r), scope)
            )
        ),
      LayerFresh: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (__: MemoMap) => _.self.buildWithScope(scope)
        ),
      LayerScoped: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (__: MemoMap) => scope().extend(_.self)
        ),
      LayerSuspend: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self(), scope)
        ),
      LayerTo: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap
              .getOrElseMemoize(_.self, scope)
              .flatMap((r) =>
                memoMap
                  .getOrElseMemoize(_.that, scope)
                  .provideEnvironment(r, __tsplusTrace)
              )
        ),
      LayerZipWithPar: (_) =>
        Effect.sync<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
          (memoMap: MemoMap) =>
            memoMap
              .getOrElseMemoize(_.self, scope)
              .zipWithPar(memoMap.getOrElseMemoize(_.that, scope), _.f)
        )
    })
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 *
 * @tsplus getter effect/core/io/Layer isFresh
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh"
}
