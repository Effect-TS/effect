// ets_tracing: off

/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import * as Tp from "../Collections/Immutable/Tuple"
import type { Either } from "../Either"
import type { NoSuchElementException } from "../GlobalExceptions"
import type { AnyService, Has, Tag } from "../Has"
import type { Managed } from "../Managed/managed"
import { ManagedImpl } from "../Managed/managed"
import type { ReleaseMap } from "../Managed/ReleaseMap"
import { makeReleaseMap } from "../Managed/ReleaseMap/makeReleaseMap"
import { releaseAll } from "../Managed/ReleaseMap/releaseAll"
import type { Option } from "../Option"
import * as Utils from "../Utils"
import { bracketExit_ } from "./bracketExit"
import { _A, _E, _R } from "./commons"
import { chain_, succeed, suspend, unit } from "./core"
import type { Effect } from "./effect"
import { sequential } from "./ExecutionStrategy"
import { fail } from "./fail"
import { fromEither } from "./fromEither"
import { getOrFail } from "./getOrFail"
import { service } from "./has"
import { map_ } from "./map"
import { provideSome_ } from "./provideSome"

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
      return new GenEffect(_._tag === "None" ? fail(__()) : succeed(_.value), ___)
    }
    return new GenEffect(getOrFail(_), __)
  }
  if (Utils.isTag(_)) {
    return new GenEffect(service(_), __)
  }
  return new GenEffect(_, __)
}

export interface Adapter {
  <A extends AnyService>(_: Tag<A>, __trace?: string): GenEffect<Has<A>, never, A>
  <E, A>(_: Option<A>, onNone: () => E, __trace?: string): GenEffect<unknown, E, A>
  <A>(_: Option<A>, __trace?: string): GenEffect<unknown, NoSuchElementException, A>
  <E, A>(_: Either<E, A>, __trace?: string): GenEffect<unknown, E, A>
  <R, E, A>(_: Effect<R, E, A>, __trace?: string): GenEffect<R, E, A>
}

export interface AdapterWithManaged extends Adapter {
  <R, E, A>(_: Managed<R, E, A>, __trace?: string): GenEffect<R, E, A>
}

export function genM<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: AdapterWithManaged) => Generator<Eff, AEff, any>,
  __trace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      rm: ReleaseMap,
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(
        suspend(
          () =>
            state.value.trace
              ? state.value["effect"] instanceof ManagedImpl
                ? map_(
                    provideSome_(state.value["effect"]["effect"], (r0) =>
                      Tp.tuple(r0, rm)
                    ),
                    (_) => _.get(1)
                  )
                : (state.value["effect"] as Effect<any, any, any>)
              : state.value["effect"] instanceof ManagedImpl
              ? map_(
                  provideSome_(state.value["effect"]["effect"], (r0) =>
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
      bracketExit_(
        unit,
        () => run(rm, state),
        (_, e) => releaseAll(e, sequential)(rm)
      )
    )
  }, __trace)
}

export function gen<Eff extends GenEffect<any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __trace?: string
): Effect<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(
        suspend(
          () => state.value["effect"] as Effect<any, any, any>,
          state.value.trace
        ),
        (val: any) => run(iterator.next(val))
      )
    }

    return run(state)
  }, __trace)
}
