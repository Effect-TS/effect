import { _A, RefSym } from "@effect/core/io/Ref/definition"
import { RefInternal } from "@effect/core/io/Ref/operations/_internal/RefInternal"
import { scheduleTask } from "@effect/core/support/Scheduler"

export class UnsafeAPI<A> {
  constructor(readonly value: AtomicReference<A>) {}

  get get(): A {
    return this.value.get
  }

  getAndSet(a: A): A {
    const current = this.value.get

    this.value.compareAndSet(current, a)

    return current
  }

  getAndUpdate(f: (a: A) => A): A {
    const current = this.value.get

    this.value.compareAndSet(current, f(current))

    return current
  }

  getAndUpdateSome(pf: (a: A) => Maybe<A>): A {
    const current = this.value.get

    this.value.compareAndSet(current, pf(current).getOrElse(current))

    return current
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>): B {
    const current = this.value.get
    const tuple = f(current)

    this.value.compareAndSet(current, tuple.get(1))

    return tuple.get(0)
  }

  modifySome<B>(fallback: B, pf: (a: A) => Maybe<Tuple<[B, A]>>): B {
    const current = this.value.get
    const tuple = pf(current).getOrElse(Tuple(fallback, current))

    this.value.compareAndSet(current, tuple.get(1))

    return tuple.get(0)
  }

  set(a: A): void {
    return this.value.set(a)
  }

  setAsync(a: A): void {
    return scheduleTask(() => this.value.set(a))
  }

  update(f: (a: A) => A): void {
    const current = this.value.get

    this.value.compareAndSet(current, f(current))
  }

  updateAndGet(f: (a: A) => A): A {
    const current = this.value.get
    const next = f(current)

    this.value.compareAndSet(current, next)

    return next
  }

  updateSome(pf: (a: A) => Maybe<A>): void {
    const current = this.value.get

    this.value.compareAndSet(current, pf(current).getOrElse(current))
  }

  updateSomeAndGet(pf: (a: A) => Maybe<A>): A {
    const current = this.value.get
    const next = pf(current).getOrElse(current)

    this.value.compareAndSet(current, next)

    return next
  }
}

export interface AtomicInternal<A> extends Ref<A> {
  readonly unsafe: UnsafeAPI<A>
}

export const AtomicInternal = {
  ...RefInternal,
  /**
   * Internal Discriminator
   */
  get [RefSym](): RefSym {
    return RefSym
  },
  get<A>(this: AtomicInternal<A>, __tsplusTrace?: string): Effect.UIO<A> {
    return Effect.succeed(this.unsafe.get)
  },
  modify<A, B>(this: AtomicInternal<A>, f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string): Effect.UIO<B> {
    return Effect.succeed(this.unsafe.modify(f))
  },
  set<A>(this: AtomicInternal<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
    return Effect.succeed(this.unsafe.set(a))
  },
  setAsync<A>(this: AtomicInternal<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
    return Effect.succeed(this.unsafe.setAsync(a))
  }
}
