import { none, some, isSome, Option } from "fp-ts/lib/Option"
import { FunctionN } from "fp-ts/lib/function"

import { AsyncCancelContFn } from "../../Common"

export interface Completable<A> {
  value(): Option<A>
  isComplete(): boolean
  complete(a: A): void
  tryComplete(a: A): boolean
  listen(f: FunctionN<[A], void>): AsyncCancelContFn
}

class CompletableImpl<A> implements Completable<A> {
  completed: Option<A>
  listeners: FunctionN<[A], void>[]
  constructor() {
    this.completed = none
    this.listeners = []
  }

  set(a: A): void {
    this.completed = some(a)
    this.listeners.forEach((f) => f(a))
  }

  value(): Option<A> {
    return this.completed
  }
  isComplete(): boolean {
    return isSome(this.completed)
  }
  complete(a: A): void {
    if (isSome(this.completed)) {
      throw new Error("Die: Completable is already completed")
    }
    this.set(a)
  }
  tryComplete(a: A): boolean {
    if (isSome(this.completed)) {
      return false
    }
    this.set(a)
    return true
  }
  listen(f: FunctionN<[A], void>): AsyncCancelContFn {
    if (isSome(this.completed)) {
      f(this.completed.value)
    }
    this.listeners.push(f)
    return (cb) => {
      this.listeners = this.listeners.filter((cb) => cb !== f)
      cb()
    }
  }
}

export const makeCompletable = <A>(): Completable<A> => new CompletableImpl()
