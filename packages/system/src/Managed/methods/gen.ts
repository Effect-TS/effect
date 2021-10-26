// ets_tracing: off

import { _A, _E, _R, accessService } from "../../Effect"
import type { Effect } from "../../Effect/effect"
import { fromEither } from "../../Effect/fromEither"
import { getOrFail } from "../../Effect/getOrFail"
import type { Either } from "../../Either"
import { identity } from "../../Function"
import type { NoSuchElementException } from "../../GlobalExceptions"
import type { AnyService, Has, Tag } from "../../Has"
import type { Option } from "../../Option"
import type * as Utils from "../../Utils"
import { isEither, isOption, isTag } from "../../Utils"
import { chain_, fail } from "../core"
import { fromEffect } from "../fromEffect"
import type { Managed } from "../managed"
import { ManagedImpl } from "../managed"
import { succeed } from "../succeed"
import { suspend } from "./suspend"

export class GenManaged<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly effect: Managed<R, E, A>, readonly trace?: string) {}

  *[Symbol.iterator](): Generator<GenManaged<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any, ___?: any) => {
  if (isTag(_)) {
    return new GenManaged(fromEffect(accessService(_)(identity)), __)
  }
  if (isEither(_)) {
    return new GenManaged(fromEffect(fromEither(() => _)), __)
  }
  if (isOption(_)) {
    if (typeof __ === "function") {
      return new GenManaged(
        __
          ? _._tag === "None"
            ? fail(__())
            : succeed(_.value)
          : fromEffect(getOrFail(_)),
        ___
      )
    }
    return new GenManaged(fromEffect(getOrFail(_)), __)
  }
  if (_ instanceof ManagedImpl) {
    return new GenManaged(_, __)
  }
  return new GenManaged(fromEffect(_), __)
}

export function gen<Eff extends GenManaged<any, any, any>, AEff>(
  f: (i: {
    <A extends AnyService>(_: Tag<A>, __trace?: string): GenManaged<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E, __trace?: string): GenManaged<unknown, E, A>
    <A>(_: Option<A>, __trace?: string): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>, __trace?: string): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>, __trace?: string): GenManaged<R, E, A>
    <R, E, A>(_: Effect<R, E, A>, __trace?: string): GenManaged<R, E, A>
  }) => Generator<Eff, AEff, any>
): Managed<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Managed<any, any, AEff> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(
        suspend(() => state.value["effect"], state.value.trace),
        (val) => {
          const next = iterator.next(val)
          return run(next)
        }
      )
    }

    return run(state)
  })
}
