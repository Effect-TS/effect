import { FunctionN } from "fp-ts/lib/function"

import { Sync } from "../Support/Common/effect"
import { sync } from "../Support/Common/instructions"

export interface Ref<A> {
  /**
   * Get the current value of the Ref
   */
  readonly get: Sync<A>
  /**
   * Set the current value of the ref
   * @param a
   */
  readonly set: (a: A) => Sync<A>
  /**
   * Update the current value of the ref with a function.
   * Produces the new value
   * @param f
   */
  readonly update: (f: FunctionN<[A], A>) => Sync<A>
  /**
   * Update the current value of a ref with a function.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  readonly modify: <B>(f: FunctionN<[A], readonly [B, A]>) => Sync<B>
}

class RefImpl<A> implements Ref<A> {
  private value: A
  constructor(initial: A) {
    this.value = initial
    this.set = this.set.bind(this)
    this.modify = this.modify.bind(this)
    this.update = this.update.bind(this)
  }

  get = sync(() => this.value)

  set(a: A) {
    return sync(() => {
      const prev = this.value
      this.value = a
      return prev
    })
  }

  modify<B>(f: FunctionN<[A], readonly [B, A]>) {
    return sync(() => {
      const [b, a] = f(this.value)
      this.value = a
      return b
    })
  }

  update(f: FunctionN<[A], A>) {
    return sync(() => (this.value = f(this.value)))
  }
}

/**
 * Creates an IO that will allocate a Ref.
 * Curried form of makeRef to allow for inference on the initial type
 */
export const makeRef = <A>(initial: A): Sync<Ref<A>> => sync(() => new RefImpl(initial))
