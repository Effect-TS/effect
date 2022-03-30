/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type { Either } from "../../../data/Either"
import type { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Has, Tag } from "../../../data/Has"
import type { Option } from "../../../data/Option"
import * as Utils from "../../../data/Utils"
import { _A, _E, _R } from "../../../support/Symbols"
import type { HasScope } from "../../Scope"
import { Scope } from "../../Scope"
import { Effect } from "../definition"

export class GenEffect<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly effect: Effect<R, E, A>, readonly trace?: string) {}

  *[Symbol.iterator](): Generator<GenEffect<R, E, A>, A, any> {
    return yield this
  }
}

function adapter(_: any, __?: any, ___?: any) {
  if (Utils.isEither(_)) {
    return new GenEffect(
      Effect.fromEither(() => _),
      __
    )
  }
  if (Utils.isOption(_)) {
    if (__ && typeof __ === "function") {
      return new GenEffect(
        _._tag === "None" ? Effect.fail(() => __()) : Effect.succeed(() => _.value),
        ___
      )
    }
    return new GenEffect(Effect.getOrFail(_), __)
  }
  if (Utils.isTag(_)) {
    return new GenEffect(Effect.service(_), __)
  }
  return new GenEffect(_, __)
}

export interface Adapter {
  <A>(_: Tag<A>, __tsplusTrace?: string): GenEffect<Has<A>, never, A>
  <E, A>(_: Option<A>, onNone: () => E, __tsplusTrace?: string): GenEffect<
    unknown,
    E,
    A
  >
  <A>(_: Option<A>, __tsplusTrace?: string): GenEffect<
    unknown,
    NoSuchElementException,
    A
  >
  <E, A>(_: Either<E, A>, __tsplusTrace?: string): GenEffect<unknown, E, A>
  <R, E, A>(_: Effect<R, E, A>, __tsplusTrace?: string): GenEffect<R, E, A>
}

export interface AdapterWithScope extends Adapter {
  <R, E, A>(_: Effect<R & HasScope, E, A>, __tsplusTrace?: string): GenEffect<R, E, A>
}

/**
 * @tsplus static ets/EffectOps genWithManaged
 */
export function genScoped<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithScope) => Generator<Eff, AEff, any>,
  __tsplusTrace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      scope: Scope.Closeable,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(state.value)
      }
      return Effect.suspendSucceed(() => state.value.effect, state.value.trace).flatMap(
        (val) => {
          const next = iterator.next(val)
          return run(scope, next)
        }
      )
    }

    return Scope.make.flatMap((scope) =>
      Effect.acquireReleaseExitWith(
        Effect.unit,
        () => run(scope, state),
        (_, exit) => scope.close(exit)
      )
    )
  })
}

/**
 * @tsplus static ets/EffectOps gen
 */
export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __tsplusTrace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(state.value)
      }
      return Effect.suspendSucceed(
        () => state.value["effect"] as Effect<any, any, any>,
        state.value.trace
      ).flatMap((val: any) => run(iterator.next(val)))
    }

    return run(state)
  })
}
