import * as T from "../Effect"
import { FunctionN } from "../Function"

import { Ref } from "./Ref"

export class RefImpl<A> implements Ref<A> {
  private value: A
  constructor(initial: A) {
    this.value = initial
    this.set = this.set.bind(this)
    this.modify = this.modify.bind(this)
    this.update = this.update.bind(this)
  }

  get = T.sync(() => this.value)

  set(a: A) {
    return T.sync(() => {
      const prev = this.value
      this.value = a
      return prev
    })
  }

  modify<B>(f: FunctionN<[A], readonly [B, A]>) {
    return T.sync(() => {
      const [b, a] = f(this.value)
      this.value = a
      return b
    })
  }

  update(f: FunctionN<[A], A>) {
    return T.sync(() => (this.value = f(this.value)))
  }
}
