import { _A, RefSym } from "@effect/core/io/Ref/definition"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export class UnsafeAPI<A> {
  constructor(readonly value: MutableRef.MutableRef<A>) {}

  get get(): A {
    return MutableRef.get(this.value)
  }

  getAndSet(a: A): A {
    const current = MutableRef.get(this.value)
    pipe(this.value, MutableRef.set(a))
    return current
  }

  getAndUpdate(f: (a: A) => A): A {
    const current = MutableRef.get(this.value)
    pipe(this.value, MutableRef.set(f(current)))
    return current
  }

  getAndUpdateSome(pf: (a: A) => Option.Option<A>): A {
    const current = MutableRef.get(this.value)
    const option = pf(current)
    if (Option.isSome(option)) {
      pipe(this.value, MutableRef.set(option.value))
    }
    return current
  }

  modify<B>(f: (a: A) => readonly [B, A]): B {
    const current = MutableRef.get(this.value)
    const [b, a] = f(current)
    pipe(this.value, MutableRef.set(a))
    return b
  }

  modifySome<B>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): B {
    const current = MutableRef.get(this.value)
    const tuple = pipe(
      pf(current),
      Option.getOrElse([fallback, current] as const)
    )
    pipe(this.value, MutableRef.set(tuple[1]))
    return tuple[0]
  }

  set(a: A): void {
    pipe(this.value, MutableRef.set(a))
  }

  update(f: (a: A) => A): void {
    const current = MutableRef.get(this.value)
    pipe(this.value, MutableRef.set(f(current)))
  }

  updateAndGet(f: (a: A) => A): A {
    const current = MutableRef.get(this.value)
    const next = f(current)
    pipe(this.value, MutableRef.set(next))
    return next
  }

  updateSome(pf: (a: A) => Option.Option<A>): void {
    const current = MutableRef.get(this.value)
    const option = pf(current)
    if (Option.isSome(option)) {
      pipe(this.value, MutableRef.set(option.value))
    }
  }

  updateSomeAndGet(pf: (a: A) => Option.Option<A>): A {
    const current = MutableRef.get(this.value)
    const next = pf(current)
    if (Option.isSome(next)) {
      pipe(this.value, MutableRef.set(next.value))
      return next.value
    }
    return current
  }
}

/** @internal */
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

  get get(): Effect<never, never, A> {
    return Effect.sync(this.unsafe.get)
  }

  modify<B>(
    this: this,
    f: (a: A) => readonly [B, A]
  ): Effect<never, never, B> {
    return Effect.sync(this.unsafe.modify(f))
  }

  set(this: this, a: A): Effect<never, never, void> {
    return Effect.sync(this.unsafe.set(a))
  }

  getAndSet(this: this, a: A): Effect<never, never, A> {
    return this.modify((v) => [v, a] as const)
  }

  getAndUpdate(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify((v) => [v, f(v)] as const)
  }

  getAndUpdateSome(
    this: this,
    pf: (a: A) => Option.Option<A>
  ): Effect<never, never, A> {
    return this.modify((v) => [v, pipe(pf(v), Option.getOrElse(v))] as const)
  }

  modifySome<B>(
    this: this,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect<never, never, B> {
    return this.modify((v) => pipe(pf(v), Option.getOrElse([fallback, v] as const)))
  }

  update(this: this, f: (a: A) => A): Effect<never, never, void> {
    return this.modify((v) => [undefined as void, f(v)] as const)
  }

  updateAndGet(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify(v => {
      const result = f(v)

      return [result, result] as const
    })
  }

  updateSome(
    this: this,
    pf: (a: A) => Option.Option<A>
  ): Effect<never, never, void> {
    return this.modify((v) => [undefined as void, pipe(pf(v), Option.getOrElse(v))] as const)
  }

  updateSomeAndGet(
    this: this,
    pf: (a: A) => Option.Option<A>
  ): Effect<never, never, A> {
    return this.modify(v => {
      const result = pipe(pf(v), Option.getOrElse(v))
      return [result, result] as const
    })
  }
}
