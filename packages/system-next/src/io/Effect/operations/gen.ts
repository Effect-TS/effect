/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import * as Tp from "../../../collection/immutable/Tuple"
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
import type { Effect } from "../definition"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"
import { chain_ } from "./chain"
import { sequential } from "./ExecutionStrategy"
import { fail } from "./fail"
import { fromEither } from "./fromEither"
import { getOrFail } from "./getOrFail"
import { map_ } from "./map"
import { provideSomeEnvironment_ } from "./provideSomeEnvironment"
import { service } from "./service"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"
import { unit } from "./unit"

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
      fromEither(() => _),
      __
    )
  }
  if (Utils.isOption(_)) {
    if (__ && typeof __ === "function") {
      return new GenEffect(_._tag === "None" ? fail(__()) : succeed(() => _.value), ___)
    }
    return new GenEffect(getOrFail(_), __)
  }
  if (Utils.isTag(_)) {
    return new GenEffect(service(_), __)
  }
  return new GenEffect(_, __)
}

export interface Adapter {
  <A>(_: Tag<A>, __trace?: string): GenEffect<Has<A>, never, A>
  <E, A>(_: Option<A>, onNone: () => E, __trace?: string): GenEffect<unknown, E, A>
  <A>(_: Option<A>, __trace?: string): GenEffect<unknown, NoSuchElementException, A>
  <E, A>(_: Either<E, A>, __trace?: string): GenEffect<unknown, E, A>
  <R, E, A>(_: Effect<R, E, A>, __trace?: string): GenEffect<R, E, A>
}

export interface AdapterWithManaged extends Adapter {
  <R, E, A>(_: Managed<R, E, A>, __trace?: string): GenEffect<R, E, A>
}

/**
 * @ets static ets/EffectOps genWithManaged
 */
export function genM<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithManaged) => Generator<Eff, AEff, any>,
  __trace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      rm: ReleaseMap,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return succeed(() => state.value)
      }
      return chain_(
        suspendSucceed(
          () =>
            state.value.trace
              ? state.value["effect"] instanceof ManagedImpl
                ? map_(
                    provideSomeEnvironment_(state.value["effect"]["effect"], (r0) =>
                      Tp.tuple(r0, rm)
                    ),
                    (_) => _.get(1)
                  )
                : (state.value["effect"] as Effect<any, any, any>)
              : state.value["effect"] instanceof ManagedImpl
              ? map_(
                  provideSomeEnvironment_(state.value["effect"]["effect"], (r0) =>
                    Tp.tuple(r0, rm)
                  ),
                  (_) => _.get(1)
                )
              : (state.value["effect"] as Effect<any, any, any>),
          state.value.trace
        ),
        (val) => {
          const next = iterator.next(val)
          return run(rm, next)
        }
      )
    }

    return chain_(makeReleaseMap, (rm) =>
      acquireReleaseExitWith_(
        unit,
        () => run(rm, state),
        (_, e) => releaseAll(e, sequential)(rm)
      )
    )
  }, __trace)
}

/**
 * @ets static ets/EffectOps gen
 */
export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __trace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspendSucceed(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return succeed(() => state.value)
      }
      return chain_(
        suspendSucceed(
          () => state.value["effect"] as Effect<any, any, any>,
          state.value.trace
        ),
        (val: any) => run(iterator.next(val))
      )
    }

    return run(state)
  }, __trace)
}
