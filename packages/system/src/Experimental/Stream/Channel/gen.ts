// tracing: off

import * as T from "../../../Effect"
import { _A, _E, _I, _L, _O, _R, _U } from "../../../Effect/commons"
import type { Either } from "../../../Either"
import type { NoSuchElementException } from "../../../GlobalExceptions"
import type { Has, Tag } from "../../../Has"
import type { Option } from "../../../Option"
import * as Utils from "../../../Utils"
import * as core from "./core"
import { ChannelTypeId } from "./core"

export function isChannel(
  u: unknown
): u is core.Channel<any, any, any, any, any, any, any> {
  return typeof u === "object" && u != null && ChannelTypeId in u
}

export class GenChannel<R, E, L, I, A, U, O> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_L]!: () => L;
  readonly [_I]!: (_I: I) => void;
  readonly [_O]!: () => O;
  readonly [_U]!: (_U: U) => void;
  readonly [_A]!: () => A

  constructor(readonly effect: core.Channel<R, E, L, I, A, U, O>) {}

  *[Symbol.iterator](): Generator<GenChannel<R, E, L, I, A, U, O>, O, any> {
    return yield this
  }
}

function adapter(_: any, __?: any) {
  if (Utils.isEither(_)) {
    return new GenChannel(
      core.effect(
        T.map_(
          T.fromEither(() => _),
          core.succeed
        )
      )
    )
  }
  if (Utils.isOption(_)) {
    if (__ && typeof __ === "function") {
      return new GenChannel(
        core.effect(
          T.map_(_._tag === "None" ? T.fail(__()) : T.succeed(_.value), core.succeed)
        )
      )
    }
    return new GenChannel(core.effect(T.map_(T.getOrFail(_), core.succeed)))
  }
  if (Utils.isTag(_)) {
    return new GenChannel(core.effect(T.map_(T.service(_), core.succeed)))
  }
  if (isChannel(_)) {
    return new GenChannel(_)
  }
  return new GenChannel(core.effect(T.map_(_, core.succeed)))
}

export interface Adapter {
  <A>(_: Tag<A>): GenChannel<Has<A>, never, never, unknown, never, unknown, A>
  <E, A>(_: Option<A>, onNone: () => E): GenChannel<
    unknown,
    E,
    never,
    unknown,
    never,
    unknown,
    A
  >
  <A>(_: Option<A>): GenChannel<
    unknown,
    NoSuchElementException,
    never,
    unknown,
    never,
    unknown,
    A
  >
  <E, A>(_: Either<E, A>): GenChannel<unknown, E, never, unknown, never, unknown, A>
  <R, E, A>(_: T.Effect<R, E, A>): GenChannel<R, E, never, unknown, never, unknown, A>
  <R, E, L, I, A, U, O>(_: core.Channel<R, E, L, I, A, U, O>): GenChannel<
    R,
    E,
    L,
    I,
    A,
    U,
    O
  >
}

export function gen<Eff extends GenChannel<any, any, any, any, any, any, any>, AEff>(
  f: (i: Adapter) => Generator<Eff, AEff, any>,
  __trace?: string
): core.Channel<
  [Eff] extends [
    {
      [T._R]: (_: infer X) => void
    }
  ]
    ? X
    : never,
  [Eff] extends [
    {
      [T._E]: () => infer X
    }
  ]
    ? X
    : never,
  [Eff] extends [
    {
      [T._L]: () => infer X
    }
  ]
    ? X
    : never,
  [Eff] extends [
    {
      [T._I]: (_: infer X) => void
    }
  ]
    ? X
    : never,
  [Eff] extends [
    {
      [T._A]: () => infer X
    }
  ]
    ? X
    : never,
  [Eff] extends [
    {
      [T._U]: (_: infer U) => void
    }
  ]
    ? U
    : never,
  AEff
> {
  return core.suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): core.Channel<any, any, any, any, any, any, AEff> {
      if (state.done) {
        return core.succeed(state.value)
      }
      return core.chain_(state.value["effect"], (val: any) => run(iterator.next(val)))
    }

    return run(state)
  })
}
