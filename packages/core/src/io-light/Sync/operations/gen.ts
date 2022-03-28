/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type { Either } from "../../../data/Either"
import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Has, Tag } from "../../../data/Has"
import type { Option } from "../../../data/Option"
import type * as Utils from "../../../data/Utils"
import { isEither, isOption, isTag } from "../../../data/Utils"
import { _A, _E, _R } from "../../../support/Symbols"
import { Sync } from "../definition"

export class GenSync<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly sync: Sync<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenSync(Sync.service(_))
  }
  if (isEither(_)) {
    return new GenSync(_._tag === "Left" ? Sync.fail(_.left) : Sync.succeed(_.right))
  }
  if (isOption(_)) {
    return new GenSync(
      _._tag === "None"
        ? Sync.fail(() => (__ ? __() : new NoSuchElementException()))
        : Sync.succeed(_.value)
    )
  }
  return new GenSync(_)
}

export function gen<Eff extends GenSync<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
): Sync<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return Sync.suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Sync<any, any, AEff> {
      if (state.done) {
        return Sync.succeed(state.value)
      }
      return state.value["sync"].flatMap((val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}
