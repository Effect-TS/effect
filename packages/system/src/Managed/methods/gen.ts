import { accessService } from "../../Effect"
import type { Effect } from "../../Effect/effect"
import { fromEither } from "../../Effect/fromEither"
import { getOrFail } from "../../Effect/getOrFail"
import type { Either } from "../../Either"
import { identity } from "../../Function"
import type { NoSuchElementException } from "../../GlobalExceptions"
import type { Tag } from "../../Has"
import type { Option } from "../../Option"
import type { _E, _R } from "../../Utils"
import { isEither, isOption, isTag } from "../../Utils"
import { chain_, fail } from "../core"
import { fromEffect } from "../fromEffect"
import { Managed } from "../managed"
import { succeed } from "../succeed"
import { suspend } from "./suspend"

export class GenManaged<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Managed<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenManaged<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenManaged(fromEffect(accessService(_)(identity)))
  }
  if (isEither(_)) {
    return new GenManaged(fromEffect(fromEither(() => _)))
  }
  if (isOption(_)) {
    return new GenManaged(
      __
        ? _._tag === "None"
          ? fail(__())
          : succeed(_.value)
        : fromEffect(getOrFail(_))
    )
  }
  if (_ instanceof Managed) {
    return new GenManaged(_)
  }
  return new GenManaged(fromEffect(_))
}

export function gen<RBase, EBase, AEff>(): <Eff extends GenManaged<RBase, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<A, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenManaged<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Managed<_R<Eff>, _E<Eff>, AEff>
export function gen<EBase, AEff>(): <Eff extends GenManaged<any, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<A, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenManaged<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Managed<_R<Eff>, _E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenManaged<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<A, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenManaged<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Managed<_R<Eff>, _E<Eff>, AEff>
export function gen<Eff extends GenManaged<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<A, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenManaged<R, E, A>
  }) => Generator<Eff, AEff, any>
): Managed<_R<Eff>, _E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenManaged<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Managed<_R<Eff>, _E<Eff>, AEff> {
    return suspend(() => {
      const iterator = f(adapter as any)
      const state = iterator.next()

      function run(
        state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
      ): Managed<any, any, AEff> {
        if (state.done) {
          return succeed(state.value)
        }
        return chain_(state.value["effect"], (val) => {
          const next = iterator.next(val)
          return run(next)
        })
      }

      return run(state)
    })
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
