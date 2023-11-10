import { Effect, Ref } from "effect"
import { pipe } from "effect/Function"
import type { Scope } from "effect/Scope"

interface Counter {
  acquire(): Effect<Scope, never, number>
  incrementAcquire(): Effect<never, never, number>
  incrementRelease(): Effect<never, never, number>
  acquired(): Effect<never, never, number>
  released(): Effect<never, never, number>
}

class CounterImpl implements Counter {
  constructor(readonly ref: Ref<readonly [number, number]>) {}

  acquire(): Effect<Scope, never, number> {
    return pipe(
      this.incrementAcquire(),
      Effect.zipRight(Effect.addFinalizer(() => this.incrementRelease())),
      Effect.zipRight(this.acquired()),
      Effect.uninterruptible
    )
  }

  incrementAcquire(): Effect<never, never, number> {
    return Ref.modify(this.ref, ([acquire, release]) => [acquire + 1, [acquire + 1, release] as const] as const)
  }

  incrementRelease(): Effect<never, never, number> {
    return Ref.modify(this.ref, ([acquire, release]) => [release + 1, [acquire, release + 1] as const] as const)
  }

  acquired(): Effect<never, never, number> {
    return pipe(
      Ref.get(this.ref),
      Effect.map((tuple) => tuple[0])
    )
  }

  released(): Effect<never, never, number> {
    return pipe(
      Ref.get(this.ref),
      Effect.map((tuple) => tuple[1])
    )
  }
}

export const make = (): Effect<never, never, Counter> => {
  return pipe(
    Ref.make([0, 0] as const),
    Effect.map((ref) => new CounterImpl(ref))
  )
}
