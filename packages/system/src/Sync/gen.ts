// ets_tracing: off

/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { _A, _E, _R } from "../Effect/commons"
import type { Either } from "../Either"
import { identity } from "../Function"
import { NoSuchElementException } from "../GlobalExceptions"
import type { Has, Tag } from "../Has"
import type { Option } from "../Option"
import type * as Utils from "../Utils"
import { isEither, isOption, isTag } from "../Utils"
import type { Sync } from "./core"
import { chain_, fail, succeed, suspend } from "./core"
import { accessService } from "./has"

export class GenSync<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

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

export function gen<Eff extends GenSync<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<Eff, AEff, any>
): Sync<Utils._R<Eff>, Utils._E<Eff>, AEff> {
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
