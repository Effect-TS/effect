import type { Either } from "../Either"
import { NoSuchElementException } from "../GlobalExceptions"
import type { Option } from "../Option"
import type { _E } from "../Utils"
import { chain_, left, right } from "./core"

export class GenEither<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Either<E, A>) {}

  *[Symbol.iterator](): Generator<GenEither<E, A>, A, any> {
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

const adapter = (_: any) => {
  return isOption(_)
    ? new GenEither(
        _._tag === "Some" ? right(_.value) : left(new NoSuchElementException())
      )
    : new GenEither(_)
}

export function gen<Eff extends GenEither<any, any>, EEff extends _E<Eff>, AEff>(
  f: (i: {
    <A>(_: Option<A>): GenEither<NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenEither<E, A>
  }) => Generator<Eff, AEff, any>
): Either<EEff, AEff> {
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
