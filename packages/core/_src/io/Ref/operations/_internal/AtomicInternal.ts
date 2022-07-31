import { _A, RefSym } from "@effect/core/io/Ref/definition"

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

export class AtomicInternal<A> implements Ref<A> {
  constructor(readonly unsafe: UnsafeAPI<A>) {}

  get [_A](): (_: never) => A {
    return (a) => a
  }

  /**
   * Internal Discriminator
   */
  get [RefSym](): RefSym {
    return RefSym
  }

  get(this: this): Effect<never, never, A> {
    return Effect.sync(this.unsafe.get)
  }

  modify<B>(
    this: this,
    f: (a: A) => Tuple<[B, A]>
  ): Effect<never, never, B> {
    return Effect.sync(this.unsafe.modify(f))
  }

  set(this: this, a: A): Effect<never, never, void> {
    return Effect.sync(this.unsafe.set(a))
  }

  getAndSet(this: this, a: A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, a))
  }

  getAndUpdate(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, f(v)))
  }

  getAndUpdateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, pf(v).getOrElse(v)))
  }

  modifySome<B>(
    this: this,
    fallback: B,
    pf: (a: A) => Maybe<Tuple<[B, A]>>
  ): Effect<never, never, B> {
    return this.modify((v) => pf(v).getOrElse(Tuple(fallback, v)))
  }

  update(this: this, f: (a: A) => A): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, f(v)))
  }

  updateAndGet(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify(v => {
      const result = f(v)

      return Tuple(result, result)
    })
  }

  updateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, pf(v).getOrElse(v)))
  }

  updateSomeAndGet(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify(v => {
      const result = pf(v).getOrElse(v)
      return Tuple(result, result)
    })
  }
}
