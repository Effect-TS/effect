import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import type { _E } from "@effect-ts/system/Utils"
import { isEither, isOption } from "@effect-ts/system/Utils"

import type { Either } from "../Either"
import type { Option } from "../Option"
import type { TaskEither } from "./core"
import * as T from "./core"

export class GenTaskEither<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: TaskEither<E, A>) {}

  *[Symbol.iterator](): Generator<GenTaskEither<E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  return isOption(_)
    ? new GenTaskEither(
        _._tag === "Some"
          ? T.succeed(_.value)
          : T.fail(__ ? __() : new NoSuchElementException())
      )
    : isEither(_)
    ? new GenTaskEither(_._tag === "Left" ? T.fail(_.left) : T.succeed(_.right))
    : new GenTaskEither(_)
}

export function gen<EBase, AEff>(): <Eff extends GenTaskEither<EBase, any>>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenTaskEither<E, A>
    <A>(_: Option<A>): GenTaskEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenTaskEither<E, A>
    <E, A>(_: TaskEither<E, A>): GenTaskEither<E, A>
  }) => Generator<Eff, AEff, any>
) => TaskEither<_E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenTaskEither<any, any>>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenTaskEither<E, A>
    <A>(_: Option<A>): GenTaskEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenTaskEither<E, A>
    <E, A>(_: TaskEither<E, A>): GenTaskEither<E, A>
  }) => Generator<Eff, AEff, any>
) => TaskEither<_E<Eff>, AEff>
export function gen<Eff extends GenTaskEither<any, any>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenTaskEither<E, A>
    <A>(_: Option<A>): GenTaskEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenTaskEither<E, A>
    <E, A>(_: TaskEither<E, A>): GenTaskEither<E, A>
  }) => Generator<Eff, AEff, any>
): TaskEither<_E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenTaskEither<any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): TaskEither<_E<Eff>, AEff> {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): TaskEither<any, AEff> {
      if (state.done) {
        return T.succeed(state.value)
      }
      return T.chain((val) => {
        const next = iterator.next(val)
        return run(next)
      })(state.value["effect"])
    }

    return run(state)
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
