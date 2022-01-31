/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import type { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Has, Tag } from "../../../data/Has"
import type { Option } from "../../../data/Option"
import * as Utils from "../../../data/Utils"
import { _A, _E, _R } from "../../../support/Symbols"
import type { Managed } from "../../Managed/definition"
import { ManagedImpl } from "../../Managed/definition"
import type { ReleaseMap } from "../../Managed/ReleaseMap"
import { make as makeReleaseMap } from "../../Managed/ReleaseMap/make"
import { releaseAll } from "../../Managed/ReleaseMap/releaseAll"
import { Effect } from "../definition"
import { sequential } from "./ExecutionStrategy"

export class GenEffect<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(
    readonly effect: Effect<R, E, A> | Managed<R, E, A>,
    readonly trace?: string
  ) {}

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
  <A>(_: Tag<A>, __etsTrace?: string): GenEffect<Has<A>, never, A>
  <E, A>(_: Option<A>, onNone: () => E, __etsTrace?: string): GenEffect<unknown, E, A>
  <A>(_: Option<A>, __etsTrace?: string): GenEffect<unknown, NoSuchElementException, A>
  <E, A>(_: Either<E, A>, __etsTrace?: string): GenEffect<unknown, E, A>
  <R, E, A>(_: Effect<R, E, A>, __etsTrace?: string): GenEffect<R, E, A>
}

export interface AdapterWithManaged extends Adapter {
  <R, E, A>(_: Managed<R, E, A>, __etsTrace?: string): GenEffect<R, E, A>
}

/**
 * @tsplus static ets/EffectOps genWithManaged
 */
export function genM<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithManaged) => Generator<Eff, AEff, any>,
  __etsTrace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      rm: ReleaseMap,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(() => state.value)
      }
      return Effect.suspendSucceed(
        () =>
          state.value.trace
            ? state.value["effect"] instanceof ManagedImpl
              ? state.value["effect"]["effect"]
                  .provideSomeEnvironment((r0) => Tuple(r0, rm))
                  .map((_) => _.get(1))
              : (state.value["effect"] as Effect<any, any, any>)
            : state.value["effect"] instanceof ManagedImpl
            ? state.value["effect"]["effect"]
                .provideSomeEnvironment((r0) => Tuple(r0, rm))
                .map((_) => _.get(1))
            : (state.value["effect"] as Effect<any, any, any>),
        state.value.trace
      ).flatMap((val) => {
        const next = iterator.next(val)
        return run(rm, next)
      })
    }

    return makeReleaseMap.flatMap((rm) =>
      Effect.unit.acquireReleaseExitWith(
        () => run(rm, state),
        (_, e) => releaseAll(e, sequential)(rm)
      )
    )
  })
}

/**
 * @tsplus static ets/EffectOps gen
 */
export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __etsTrace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return Effect.suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return Effect.succeed(() => state.value)
      }
      return Effect.suspendSucceed(
        () => state.value["effect"] as Effect<any, any, any>,
        state.value.trace
      ).flatMap((val: any) => run(iterator.next(val)))
    }

    return run(state)
  })
}
