// ets_tracing: off

import { _A, _E } from "../Effect/commons.js"
import { NoSuchElementException } from "../GlobalExceptions/index.js"
import type { Option } from "../Option/index.js"
import * as Utils from "../Utils/index.js"
import type { Either } from "./core.js"
import { chain_, left, right } from "./core.js"

export class GenEither<E, A> {
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly effect: Either<E, A>) {}

  *[Symbol.iterator](): Generator<GenEither<E, A>, A, any> {
    return yield this
  }
}

function adapter(_: any, __?: any) {
  return Utils.isOption(_)
    ? new GenEither(
        _._tag === "Some"
          ? right(_.value)
          : left(__ ? __() : new NoSuchElementException())
      )
    : new GenEither(_)
}

export function gen<Eff extends GenEither<any, any>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>
    <A>(_: Option<A>): GenEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenEither<E, A>
  }) => Generator<Eff, AEff, any>
): Either<Utils._E<Eff>, AEff> {
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
