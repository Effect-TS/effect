/* adapted from https://github.com/rzeigler/waveguide */

import { Predicate } from "../../Function"
import { pipe } from "../../Function"
import {
  cons,
  List,
  nil,
  cata_,
  reverse,
  cata,
  filter_,
  size,
  isEmpty,
  find_,
  of as listOf
} from "../../List"
import { Option, some, none, alt_ } from "../../Option"

export interface Dequeue<A> {
  take(): Option<readonly [A, Dequeue<A>]>
  offer(a: A): Dequeue<A>
  pull(): Option<readonly [A, Dequeue<A>]>
  push(a: A): Dequeue<A>
  filter(f: Predicate<A>): Dequeue<A>
  find(p: Predicate<A>): Option<A>
  size(): number
  isEmpty(): boolean
}

class DequeueImpl<A> implements Dequeue<A> {
  constructor(readonly front: List<A>, readonly back: List<A>) {}

  take(): Option<readonly [A, Dequeue<A>]> {
    return cata_(
      this.front,
      (h, t) => some([h, new DequeueImpl(t, this.back)] as const),
      () =>
        pipe(
          this.back,
          reverse,
          cata(
            (h, t) => some([h, new DequeueImpl(t, nil)] as const),
            () => none
          )
        )
    )
  }

  offer(a: A): Dequeue<A> {
    return new DequeueImpl(this.front, cons(a, this.back))
  }

  pull(): Option<readonly [A, Dequeue<A>]> {
    return cata_(
      this.back,
      (h, t) => some([h, new DequeueImpl(this.front, t)] as const),
      () =>
        pipe(
          this.front,
          reverse,
          cata(
            (h, t) => some([h, new DequeueImpl(nil, t)] as const),
            () => none
          )
        )
    )
  }

  push(a: A): Dequeue<A> {
    return new DequeueImpl(cons(a, this.front), this.back)
  }

  filter(p: Predicate<A>): Dequeue<A> {
    return new DequeueImpl(filter_(this.front, p), filter_(this.back, p))
  }

  size(): number {
    return size(this.front) + size(this.back)
  }

  isEmpty(): boolean {
    return isEmpty(this.front) && isEmpty(this.back)
  }

  find(p: Predicate<A>): Option<A> {
    return alt_(find_(this.front, p), () => find_(this.back, p))
  }
}

export function from<A>(front: List<A>, back: List<A>): Dequeue<A> {
  return new DequeueImpl(front, back)
}

export function empty<A>(): Dequeue<A> {
  return from(nil, nil)
}

export function of<A>(a: A): Dequeue<A> {
  return from(listOf(a), nil)
}
