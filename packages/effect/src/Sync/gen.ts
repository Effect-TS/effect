/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type { Either } from "../Either"
import { NoSuchElementException } from "../GlobalExceptions"
import type { Option } from "../Option"
import type { _E, _R } from "../Utils"
import { isEither, isOption } from "../Utils"
import type { Sync } from "./core"
import { chain_, fail, succeed, suspend } from "./core"

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

export function gen<Eff extends GenSync<any, any, any>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
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
