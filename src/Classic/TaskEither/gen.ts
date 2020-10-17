import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import type { _E } from "@effect-ts/system/Utils"

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

function isOption(u: unknown): u is Option<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_tag" in u &&
    (u["_tag"] === "Some" || u["_tag"] === "None")
  )
}

function isEither(u: unknown): u is Either<unknown, unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_tag" in u &&
    (u["_tag"] === "Some" || u["_tag"] === "None")
  )
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

export function gen<Eff extends GenTaskEither<any, any>, EEff extends _E<Eff>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenTaskEither<E, A>
    <A>(_: Option<A>): GenTaskEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenTaskEither<E, A>
    <E, A>(_: TaskEither<E, A>): GenTaskEither<E, A>
  }) => Generator<Eff, AEff, any>
): TaskEither<EEff, AEff> {
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
