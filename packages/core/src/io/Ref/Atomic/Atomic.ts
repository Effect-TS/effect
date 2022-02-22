import type { Either } from "../../../data/Either"
import type { AtomicReference } from "../../../support/AtomicReference"
import { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { XRefInternal } from "../definition"
import { Derived } from "./Derived"
import { DerivedAll } from "./DerivedAll"

export class Atomic<A> extends XRefInternal<unknown, unknown, never, never, A, A> {
  readonly _tag = "Atomic"

  constructor(readonly value: AtomicReference<A>) {
    super()
  }

  get get(): Effect<unknown, never, A> {
    return Effect.succeed(this.value.get)
  }

  set(a: A, __etsTrace?: string): Effect<unknown, never, void> {
    return Effect.succeed(this.value.set(a))
  }

  fold<EC, ED, C, D>(
    ea: (_: never) => EC,
    eb: (_: never) => ED,
    ca: (_: C) => Either<EC, A>,
    bd: (_: A) => Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return new Derived((f) =>
      f(
        this,
        (s) => bd(s),
        (c) => ca(c)
      )
    )
  }

  foldAll<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => Either<EC, A>,
    bd: (_: A) => Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return new DerivedAll((f) =>
      f(
        this,
        (s) => bd(s),
        (c) => (s) => ca(c)(s)
      )
    )
  }
}
