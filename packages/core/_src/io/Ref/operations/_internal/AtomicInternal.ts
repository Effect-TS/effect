import { _A, RefSym } from "@effect/core/io/Ref/definition"
import { RefInternal } from "@effect/core/io/Ref/operations/_internal/RefInternal"

export class UnsafeAPI<A> {
  constructor(readonly value: AtomicReference<A>) {}

  get get(): A {
    return this.value.get
  }

  getAndSet(a: A): A {
    const current = this.value.get
    this.value.set(a)
    return current
  }

  getAndUpdate(f: (a: A) => A): A {
    const current = this.value.get
    this.value.set(f(current))
    return current
  }

  getAndUpdateSome(pf: (a: A) => Maybe<A>): A {
    const current = this.value.get
    const opt = pf(current)
    if (opt.isSome()) {
      this.value.set(opt.value)
    }
    return current
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>): B {
    const current = this.value.get
    const { tuple: [b, a] } = f(current)
    this.value.set(a)
    return b
  }

  modifySome<B>(fallback: B, pf: (a: A) => Maybe<Tuple<[B, A]>>): B {
    const current = this.value.get
    const tuple = pf(current).getOrElse(Tuple(fallback, current))
    this.value.set(tuple.get(1))
    return tuple.get(0)
  }

  set(a: A): void {
    return this.value.set(a)
  }

  update(f: (a: A) => A): void {
    const current = this.value.get
    this.value.set(f(current))
  }

  updateAndGet(f: (a: A) => A): A {
    const current = this.value.get
    const next = f(current)
    this.value.set(next)
    return next
  }

  updateSome(pf: (a: A) => Maybe<A>): void {
    const current = this.value.get
    const opt = pf(current)
    if (opt.isSome()) {
      this.value.set(opt.value)
    }
  }

  updateSomeAndGet(pf: (a: A) => Maybe<A>): A {
    const current = this.value.get
    const next = pf(current)
    if (next.isSome()) {
      this.value.set(next.value)
      return next.value
    }
    return current
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
    return Effect.sync(this.unsafe.get)
  },
  modify<A, B>(this: AtomicInternal<A>, f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string): Effect.UIO<B> {
    return Effect.sync(this.unsafe.modify(f))
  },
  set<A>(this: AtomicInternal<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
    return Effect.sync(this.unsafe.set(a))
  }
}
