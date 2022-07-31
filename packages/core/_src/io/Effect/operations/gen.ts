/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
export const _GenR = Symbol.for("@effect/core/io/Effect/Gen/R")
export type _GenR = typeof _GenR

export const _GenE = Symbol.for("@effect/core/io/Effect/Gen/E")
export type _GenE = typeof _GenE

export const _GenA = Symbol.for("@effect/core/io/Effect/Gen/A")
export type _GenA = typeof _GenA

export class GenEffect<R, E, A> {
  readonly [_GenR]!: () => R
  readonly [_GenE]!: () => E
  readonly [_GenA]!: () => A

  constructor(readonly effect: Effect<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenEffect<R, E, A>, A, any> {
    return yield this
  }
}

function adapter(_: any, __?: any) {
  if (Either.isEither(_)) {
    return new GenEffect(
      Effect.fromEither(() => _)
    )
  }
  if (Maybe.isMaybe(_)) {
    if (__ && typeof __ === "function") {
      return new GenEffect(
        _._tag === "None" ? Effect.failSync(() => __()) : Effect.sync(() => _.value)
      )
    }
    return new GenEffect(Effect.getOrFail(_))
  }
  if (Tag.is(_)) {
    return new GenEffect(Effect.service(_))
  }
  return new GenEffect(_)
}

export interface Adapter {
  <A>(_: Tag<A>): GenEffect<A, never, A>
  <E, A>(_: Maybe<A>, onNone: () => E): GenEffect<
    unknown,
    E,
    A
  >
  <A>(_: Maybe<A>): GenEffect<
    unknown,
    NoSuchElement,
    A
  >
  <E, A>(_: Either<E, A>): GenEffect<never, E, A>
  <R, E, A>(_: Effect<R, E, A>): GenEffect<R, E, A>
}

export interface AdapterWithScope extends Adapter {
  <R, E, A>(_: Effect<R | Scope, E, A>): GenEffect<R, E, A>
}

/**
 * @tsplus static effect/core/io/Effect.Ops genWithManaged
 */
export function genScoped<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithScope) => Generator<Eff, AEff, any>
): Effect<
  [Eff] extends [{ [_GenR]: () => infer R }] ? R : never,
  [Eff] extends [{ [_GenE]: () => infer E }] ? E : never,
  AEff
> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      scope: Scope.Closeable,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.sync(state.value)
      }
      return Effect.suspendSucceed(() => state.value.effect).flatMap(
        (val) => {
          const next = iterator.next(val)
          return run(scope, next)
        }
      )
    }

    return Scope.make.flatMap((scope) =>
      Effect.acquireUseReleaseExit(
        Effect.unit,
        () => run(scope, state),
        (_, exit) => scope.close(exit)
      )
    )
  })
}

/**
 * @tsplus static effect/core/io/Effect.Ops gen
 */
export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>
): Effect<
  [Eff] extends [{ [_GenR]: () => infer R }] ? R : never,
  [Eff] extends [{ [_GenE]: () => infer E }] ? E : never,
  AEff
> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.sync(state.value)
      }
      return Effect.suspendSucceed(() => state.value["effect"] as Effect<any, any, any>)
        .flatMap((val: any) => run(iterator.next(val)))
    }

    return run(state)
  })
}
