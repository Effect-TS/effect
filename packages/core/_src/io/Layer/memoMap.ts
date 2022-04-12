import { instruction, LayerHashSym } from "@effect/core/io/Layer/definition";

/**
 * A `MemoMap` memoizes layers.
 */
export class MemoMap {
  constructor(
    readonly ref: SynchronizedRef<
      Map<PropertyKey, Tuple<[IO<any, any>, Scope.Finalizer]>>
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
    return Effect.succeed(scope).flatMap((scope) =>
      this.ref.modifyEffect((map) => {
        const inMap = Option.fromNullable(map.get(layer[LayerHashSym].get));

        switch (inMap._tag) {
          case "Some": {
            const {
              tuple: [acquire, release]
            } = inMap.value;

            const cached: Effect<unknown, E, Env<ROut>> = acquire.onExit((exit) =>
              exit.fold(
                () => Effect.unit,
                () => scope.addFinalizerExit(release)
              )
            );

            return Effect.succeed(Tuple(cached, map));
          }
          case "None": {
            return Effect.Do()
              .bind("observers", () => SynchronizedRef.make(0))
              .bind("deferred", () => Deferred.make<E, Env<ROut>>())
              .bind("finalizerRef", () => SynchronizedRef.make<Scope.Finalizer>(() => () => Effect.unit))
              .bindValue("resource", ({ deferred, finalizerRef, observers }) =>
                Effect.uninterruptibleMask(({ restore }) =>
                  Effect.Do()
                    .bindValue("outerScope", () =>
                      scope)
                    .bind("innerScope", () => Scope.make)
                    .flatMap(({ innerScope, outerScope }) =>
                      restore(layer.withScope(innerScope).flatMap((f) => f(this)))
                        .exit()
                        .flatMap((exit) => {
                          switch (exit._tag) {
                            case "Failure": {
                              return (
                                deferred.failCause(exit.cause) >
                                  innerScope.close(exit) >
                                  Effect.failCause(exit.cause)
                              );
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
                                .as(exit.value);
                            }
                          }
                        })
                    )
                ))
              .bindValue("memoized", ({ deferred, finalizerRef, observers }) =>
                Tuple(
                  deferred.await()
                    .onExit((exit) =>
                      exit.fold(
                        () =>
                          Effect.unit,
                        () => observers.update((n) => n + 1)
                      )
                    ),
                  (e: Exit<unknown, unknown>) => finalizerRef.get().flatMap((fin) => fin(e))
                ))
              .map(({ memoized, resource }) =>
                Tuple(resource, layer.isFresh() ? map : map.set(layer[LayerHashSym].get, memoized))
              );
          }
        }
      }).flatten()
    );
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): UIO<MemoMap> {
  return SynchronizedRef.make<
    Map<PropertyKey, Tuple<[IO<any, any>, Scope.Finalizer]>>
  >(new Map()).flatMap((r) => Effect.succeed(new MemoMap(r)));
}

/**
 * Builds a layer into a scoped value.
 *
 * @tsplus fluent ets/Layer build
 */
export function build<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  __tsplusTrace?: string
): Effect<RIn & Has<Scope>, E, Env<ROut>> {
  return Effect.serviceWithEffect(Scope.Tag)((scope) => self.buildWithScope(scope));
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
): Effect<RIn, E, Env<ROut>> {
  return Effect.Do()
    .bind("memoMap", () => makeMemoMap())
    .bind("run", () => self.withScope(scope))
    .flatMap(({ memoMap, run }) => run(memoMap));
}

/**
 * @tsplus fluent ets/Layer withScope
 */
export function withScope<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
): Effect<unknown, never, (_: MemoMap) => Effect<RIn, E, Env<ROut>>> {
  return Match.tag(instruction(self), {
    LayerApply: (_) => Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>((memoMap: MemoMap) => _.self),
    LayerExtendScope: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>((memoMap: MemoMap) =>
        Effect.scopeWith((scope) => memoMap.getOrElseMemoize(_.self, scope))
      ),
    LayerFold: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
        (memoMap: MemoMap) =>
          memoMap.getOrElseMemoize(_.self, scope).foldCauseEffect(
            (e) => memoMap.getOrElseMemoize(_.failure(e), scope),
            (r) => memoMap.getOrElseMemoize(_.success(r), scope)
          )
      ),
    LayerFresh: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
        (__: MemoMap) => _.self.buildWithScope(scope)
      ),
    LayerScoped: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
        (__: MemoMap) => scope().extend(_.self)
      ),
    LayerSuspend: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
        (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self(), scope)
      ),
    LayerTo: (_) =>
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
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
      Effect.succeed<(_: MemoMap) => Effect<RIn, E, Env<ROut>>>(
        (memoMap: MemoMap) =>
          memoMap
            .getOrElseMemoize(_.self, scope)
            .zipWithPar(memoMap.getOrElseMemoize(_.that, scope), _.f)
      )
  });
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 *
 * @tsplus fluent ets/Layer isFresh
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh";
}
