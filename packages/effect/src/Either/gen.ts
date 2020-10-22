import { NoSuchElementException } from "../GlobalExceptions"
import type { Option } from "../Option"
import type { Sync } from "../Sync"
import { runEither, runEitherEnv } from "../Sync"
import type { _E } from "../Utils"
import { isOption, isSync } from "../Utils"
import type { Either } from "./core"
import { chain_, left, right } from "./core"

export class GenEither<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Either<E, A>) {}

  *[Symbol.iterator](): Generator<GenEither<E, A>, A, any> {
    return yield this
  }
}

function adapter(_: any, __?: any) {
  if (isSync(_)) {
    if (__) {
      return new GenEither(runEitherEnv(__)(_))
    }
    return new GenEither(runEither(_))
  }
  return isOption(_)
    ? new GenEither(
        _._tag === "Some"
          ? right(_.value)
          : left(__ ? __() : new NoSuchElementException())
      )
    : new GenEither(_)
}

export function gen<EBase, AEff>(): <Eff extends GenEither<EBase, any>>(
  f: (i: {
    <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>
    <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>
    <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>
    <A>(_: Option<A>): GenEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenEither<E, A>
  }) => Generator<Eff, AEff, any>
) => Either<_E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenEither<any, any>>(
  f: (i: {
    <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>
    <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>
    <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>
    <A>(_: Option<A>): GenEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenEither<E, A>
  }) => Generator<Eff, AEff, any>
) => Either<_E<Eff>, AEff>
export function gen<Eff extends GenEither<any, any>, AEff>(
  f: (i: {
    <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>
    <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>
    <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>
    <A>(_: Option<A>): GenEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenEither<E, A>
  }) => Generator<Eff, AEff, any>
): Either<_E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenEither<any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Either<_E<Eff>, AEff> {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Either<any, AEff> {
      if (state.done) {
        return right(state.value)
      }
      return chain_(state.value["effect"], (val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
