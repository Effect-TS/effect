import type { Tuple } from "../../collection/immutable/Tuple"
import type { AtomicReference } from "../../support/AtomicReference"
import { _A } from "../../support/Symbols"
import { Effect } from "../Effect"
import type { UIO } from "../Effect/definition"
import type { Ref } from "./definition"
import { RefSym } from "./definition"

export class Atomic<A> implements Ref<A> {
  readonly [RefSym]: RefSym = RefSym;
  readonly [_A]!: () => A

  constructor(readonly value: AtomicReference<A>) {}

  get get(): Effect<unknown, never, A> {
    return Effect.succeed(this.value.get)
  }

  set(a: A, __tsplusTrace?: string): Effect<unknown, never, void> {
    return Effect.succeed(this.value.set(a))
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string | undefined): UIO<B> {
    return Effect.succeed(() => {
      const v = this.value.get
      const o = f(v)
      this.value.set(o.get(1))
      return o.get(0)
    })
  }
}
