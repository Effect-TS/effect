// ets_tracing: off

/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { _A, _E, _R } from "../Effect/commons.js"
import type { Either } from "../Either/index.js"
import { identity } from "../Function/index.js"
import { NoSuchElementException } from "../GlobalExceptions/index.js"
import type { Has, Tag } from "../Has/index.js"
import type { Option } from "../Option/index.js"
import type * as Utils from "../Utils/index.js"
import { isEither, isOption, isTag } from "../Utils/index.js"
import type { Sync } from "./core.js"
import { chain_, fail, succeed, suspend } from "./core.js"
import { accessService } from "./has.js"

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
