/**
 * @tsplus type effect/core/test/io/ScopedRef/Counter
 * @tsplus companion effect/core/test/io/ScopedRef/Counter.Ops
 */
export class Counter {
  constructor(readonly ref: Ref<readonly [number, number]>) {}

  get acquired(): Effect<never, never, number> {
    return this.ref.get.map((tuple) => tuple[0])
  }

  get released(): Effect<never, never, number> {
    return this.ref.get.map((tuple) => tuple[1])
  }

  get incrementAcquire(): Effect<never, never, number> {
    return this.ref.modify(([acquire, release]) =>
      [acquire + 1, [acquire + 1, release] as const] as const
    )
  }

  get incrementRelease(): Effect<never, never, number> {
    return this.ref.modify(([acquire, release]) =>
      [release + 1, [acquire, release + 1] as const] as const
    )
  }

  get acquire(): Effect<Scope, never, number> {
    return this.incrementAcquire
      .zipRight(Effect.addFinalizer(this.incrementRelease))
      .zipRight(this.acquired)
      .uninterruptible
  }
}

/**
 * @tsplus static effect/core/test/io/ScopedRef/Counter.Ops make
 */
export function make(): Effect<never, never, Counter> {
  return Ref.make([0, 0] as const).map((ref) => new Counter(ref))
}
