import type { _A } from "@effect/core/io/Ref/definition"
import { RefSym } from "@effect/core/io/Ref/definition"

export const RefInternal = {
  /**
   * Internal Discriminator
   */
  get [RefSym](): RefSym {
    return RefSym
  },

  /**
   * Atomically writes the specified value to the `Ref`, returning the value
   * immediately before modification.
   */
  getAndSet<A>(this: Ref<A>, a: A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, a))
  },

  /**
   * Atomically modifies the `Ref` with the specified function, returning the
   * value immediately before modification.
   */
  getAndUpdate<A>(this: Ref<A>, f: (a: A) => A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, f(v)))
  },

  /**
   * Atomically modifies the `Ref` with the specified partial function,
   * returning the value immediately before modification. If the function is
   * undefined on the current value it doesn't change it.
   */
  getAndUpdateSome<A>(
    this: Ref<A>,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, pf(v).getOrElse(v)))
  },

  /**
   * Atomically modifies the `Ref` with the specified partial function, which
   * computes a return value for the modification if the function is defined on
   * the current value otherwise it returns a default value. This is a more
   * powerful version of `updateSome`.
   */
  modifySome<B, A>(
    this: Ref<A>,
    fallback: B,
    pf: (a: A) => Maybe<Tuple<[B, A]>>
  ): Effect<never, never, B> {
    return this.modify((v) => pf(v).getOrElse(Tuple(fallback, v)))
  },

  /**
   * Atomically modifies the `Ref` with the specified function.
   */
  update<A>(this: Ref<A>, f: (a: A) => A): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, f(v)))
  },

  /**
   * Atomically modifies the `Ref` with the specified function and returns the
   * updated value.
   */
  updateAndGet<A>(this: Ref<A>, f: (a: A) => A): Effect<never, never, A> {
    return this.modify(v => {
      const result = f(v)

      return Tuple(result, result)
    })
  },

  /**
   * Atomically modifies the `Ref` with the specified partial function. If the
   * function is undefined on the current value it doesn't change it.
   */
  updateSome<A>(
    this: Ref<A>,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, pf(v).getOrElse(v)))
  },

  /**
   * Atomically modifies the `Ref` with the specified partial function. If the
   * function is undefined on the current value it returns the old value without
   * changing it.
   */
  updateSomeAndGet<A>(
    this: Ref<A>,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify(v => {
      const result = pf(v).getOrElse(v)
      return Tuple(result, result)
    })
  }
}
