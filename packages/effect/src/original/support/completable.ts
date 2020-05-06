// Copyright 2019 Ryan Zeigler
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* istanbul ignore file */

import { function as F } from "fp-ts"
import { option as O } from "fp-ts"

import { AsyncCancelContFn } from "../../effect"

export interface Completable<A> {
  value(): O.Option<A>
  isComplete(): boolean
  complete(a: A): void
  tryComplete(a: A): boolean
  listen(f: F.FunctionN<[A], void>): AsyncCancelContFn
}

export class CompletableImpl<A> implements Completable<A> {
  completed: O.Option<A>
  listeners: F.FunctionN<[A], void>[]
  constructor() {
    this.completed = O.none
    this.listeners = []
  }

  set(a: A): void {
    this.completed = O.some(a)
    this.listeners.forEach((f) => f(a))
  }

  value(): O.Option<A> {
    return this.completed
  }
  isComplete(): boolean {
    return O.isSome(this.completed)
  }
  complete(a: A): void {
    if (O.isSome(this.completed)) {
      throw new Error("Die: Completable is already completed")
    }
    this.set(a)
  }
  tryComplete(a: A): boolean {
    if (O.isSome(this.completed)) {
      return false
    }
    this.set(a)
    return true
  }
  listen(f: F.FunctionN<[A], void>): AsyncCancelContFn {
    if (O.isSome(this.completed)) {
      f(this.completed.value)
    }
    this.listeners.push(f)
    return (cb) => {
      this.listeners = this.listeners.filter((cb) => cb !== f)
      cb()
    }
  }
}
