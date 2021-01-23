/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type { Either } from "../Either"
import { identity } from "../Function"
import { NoSuchElementException } from "../GlobalExceptions"
import type { Has, Tag } from "../Has"
import type { Option } from "../Option"
import type { _E, _R } from "../Utils"
import { isEither, isOption, isTag } from "../Utils"
import type { Sync } from "./core"
import { chain_, fail, succeed, suspend } from "./core"
import { accessService } from "./has"

export class GenSync<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Sync<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenSync(accessService(_)(identity))
  }
  if (isEither(_)) {
    return new GenSync(_._tag === "Left" ? fail(_.left) : succeed(_.right))
  }
  if (isOption(_)) {
    return new GenSync(
      _._tag === "None"
        ? fail(__ ? __() : new NoSuchElementException())
        : succeed(_.value)
    )
  }
  return new GenSync(_)
}

export function gen<RBase, EBase, AEff>(): <Eff extends GenSync<RBase, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Sync<_R<Eff>, _E<Eff>, AEff>
export function gen<EBase, AEff>(): <Eff extends GenSync<any, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Sync<_R<Eff>, _E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenSync<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Sync<_R<Eff>, _E<Eff>, AEff>
export function gen<Eff extends GenSync<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
): Sync<_R<Eff>, _E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenSync<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Sync<_R<Eff>, _E<Eff>, AEff> {
    return suspend(() => {
      const iterator = f(adapter as any)
      const state = iterator.next()

      function run(
        state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
      ): Sync<any, any, AEff> {
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
