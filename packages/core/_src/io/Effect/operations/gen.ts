/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { isEither, isOption, isService } from "@effect-ts/core/data/Utils";

export const _GenR = Symbol.for("@effect-ts/core/io/Effect/Gen/R");
export type _GenR = typeof _GenR;

export const _GenE = Symbol.for("@effect-ts/core/io/Effect/Gen/E");
export type _GenE = typeof _GenE;

export const _GenA = Symbol.for("@effect-ts/core/io/Effect/Gen/A");
export type _GenA = typeof _GenA;

export class GenEffect<R, E, A> {
  readonly [_GenR]!: (_R: R) => void;
  readonly [_GenE]!: () => E;
  readonly [_GenA]!: () => A;

  constructor(readonly effect: Effect<R, E, A>, readonly trace?: string) {}

  *[Symbol.iterator](): Generator<GenEffect<R, E, A>, A, any> {
    return yield this;
  }
}

function adapter(_: any, __?: any, ___?: any) {
  if (isEither(_)) {
    return new GenEffect(
      Effect.fromEither(() => _),
      __
    );
  }
  if (isOption(_)) {
    if (__ && typeof __ === "function") {
      return new GenEffect(
        _._tag === "None" ? Effect.fail(() => __()) : Effect.succeed(() => _.value),
        ___
      );
    }
    return new GenEffect(Effect.getOrFail(_), __);
  }
  if (isService(_)) {
    return new GenEffect(Effect.service(_), __);
  }
  return new GenEffect(_, __);
}

export interface Adapter {
  <A>(_: Service<A>, __tsplusTrace?: string): GenEffect<Has<A>, never, A>;
  <E, A>(_: Option<A>, onNone: () => E, __tsplusTrace?: string): GenEffect<
    unknown,
    E,
    A
  >;
  <A>(_: Option<A>, __tsplusTrace?: string): GenEffect<
    unknown,
    NoSuchElement,
    A
  >;
  <E, A>(_: Either<E, A>, __tsplusTrace?: string): GenEffect<unknown, E, A>;
  <R, E, A>(_: Effect<R, E, A>, __tsplusTrace?: string): GenEffect<R, E, A>;
}

export interface AdapterWithScope extends Adapter {
  <R, E, A>(_: Effect<R & HasScope, E, A>, __tsplusTrace?: string): GenEffect<R, E, A>;
}

/**
 * @tsplus static ets/Effect/Ops genWithManaged
 */
export function genScoped<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithScope) => Generator<Eff, AEff, any>,
  __tsplusTrace?: string
): Effect<
  [Eff] extends [{ [_GenR]: (_: infer R) => void; }] ? R : never,
  [Eff] extends [{ [_GenE]: () => infer E; }] ? E : never,
  AEff
> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any);
    const state = iterator.next();

    function run(
      scope: Scope.Closeable,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(state.value);
      }
      return Effect.suspendSucceed(() => state.value.effect, state.value.trace).flatMap(
        (val) => {
          const next = iterator.next(val);
          return run(scope, next);
        }
      );
    }

    return Scope.make.flatMap((scope) =>
      Effect.acquireReleaseExitUse(
        Effect.unit,
        () => run(scope, state),
        (_, exit) => scope.close(exit)
      )
    );
  });
}

/**
 * @tsplus static ets/Effect/Ops gen
 */
export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __tsplusTrace?: string
): Effect<
  [Eff] extends [{ [_GenR]: (_: infer R) => void; }] ? R : never,
  [Eff] extends [{ [_GenE]: () => infer E; }] ? E : never,
  AEff
> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any);
    const state = iterator.next();

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(state.value);
      }
      return Effect.suspendSucceed(
        () => state.value["effect"] as Effect<any, any, any>,
        state.value.trace
      ).flatMap((val: any) => run(iterator.next(val)));
    }

    return run(state);
  });
}
