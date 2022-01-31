// ets_tracing: off

import type { Effect } from "../../Effect/effect.js"
import { fromEither } from "../../Effect/fromEither.js"
import { getOrFail } from "../../Effect/getOrFail.js"
import { _A, _E, _R, accessService } from "../../Effect/index.js"
import type { Either } from "../../Either/index.js"
import { identity } from "../../Function/index.js"
import type { NoSuchElementException } from "../../GlobalExceptions/index.js"
import type { Has, Tag } from "../../Has/index.js"
import type { Option } from "../../Option/index.js"
import type * as Utils from "../../Utils/index.js"
import { isEither, isOption, isTag } from "../../Utils/index.js"
import { chain_, fail } from "../core.js"
import { fromEffect } from "../fromEffect.js"
import type { Managed } from "../managed.js"
import { ManagedImpl } from "../managed.js"
import { succeed } from "../succeed.js"
import { suspend } from "./suspend.js"

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
    <A>(_: Tag<A>, __trace?: string): GenManaged<Has<A>, never, A>
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
