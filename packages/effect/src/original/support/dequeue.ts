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

import { function as F, option as O, pipeable as P } from "fp-ts"

import * as l from "./list"
import { cons, List, nil } from "./list"

export interface Dequeue<A> {
  take(): O.Option<readonly [A, Dequeue<A>]>
  offer(a: A): Dequeue<A>
  pull(): O.Option<readonly [A, Dequeue<A>]>
  push(a: A): Dequeue<A>
  filter(f: F.Predicate<A>): Dequeue<A>
  find(p: F.Predicate<A>): O.Option<A>
  size(): number
  isEmpty(): boolean
}

class DequeueImpl<A> implements Dequeue<A> {
  constructor(readonly front: List<A>, readonly back: List<A>) {}

  take(): O.Option<readonly [A, Dequeue<A>]> {
    return l.cata(
      this.front,
      (h, t) => O.some([h, new DequeueImpl(t, this.back)] as const),
      () =>
        P.pipe(
          this.back,
          l.reverse,
          l.catac(
            (h, t) => O.some([h, new DequeueImpl(t, nil)] as const),
            () => O.none
          )
        )
    )
  }

  offer(a: A): Dequeue<A> {
    return new DequeueImpl(this.front, cons(a, this.back))
  }

  pull(): O.Option<readonly [A, Dequeue<A>]> {
    return l.cata(
      this.back,
      (h, t) => O.some([h, new DequeueImpl(this.front, t)] as const),
      () =>
        P.pipe(
          this.front,
          l.reverse,
          l.catac(
            (h, t) => O.some([h, new DequeueImpl(nil, t)] as const),
            () => O.none
          )
        )
    )
  }

  push(a: A): Dequeue<A> {
    return new DequeueImpl(cons(a, this.front), this.back)
  }

  filter(p: F.Predicate<A>): Dequeue<A> {
    return new DequeueImpl(l.filter(this.front, p), l.filter(this.back, p))
  }

  size(): number {
    return l.size(this.front) + l.size(this.back)
  }

  isEmpty(): boolean {
    return l.isEmpty(this.front) && l.isEmpty(this.back)
  }

  find(p: F.Predicate<A>): O.Option<A> {
    return O.option.alt(l.find(this.front, p), () => l.find(this.back, p))
  }
}

export function from<A>(front: List<A>, back: List<A>): Dequeue<A> {
  return new DequeueImpl(front, back)
}

export function empty<A>(): Dequeue<A> {
  return from(nil, nil)
}

export function of<A>(a: A): Dequeue<A> {
  return from(l.of(a), nil)
}
