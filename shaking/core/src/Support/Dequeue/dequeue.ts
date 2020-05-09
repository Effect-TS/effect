import { Option, some, none, option } from "fp-ts/lib/Option"
import { Predicate } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import {
  cons,
  List,
  nil,
  cata,
  reverse,
  catac,
  filter,
  size,
  isEmpty,
  find,
  of as listOf
} from "../List"

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
    return cata(
      this.front,
      (h, t) => some([h, new DequeueImpl(t, this.back)] as const),
      () =>
        pipe(
          this.back,
          reverse,
          catac(
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
    return cata(
      this.back,
      (h, t) => some([h, new DequeueImpl(this.front, t)] as const),
      () =>
        pipe(
          this.front,
          reverse,
          catac(
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
    return new DequeueImpl(filter(this.front, p), filter(this.back, p))
  }

  size(): number {
    return size(this.front) + size(this.back)
  }

  isEmpty(): boolean {
    return isEmpty(this.front) && isEmpty(this.back)
  }

  find(p: Predicate<A>): Option<A> {
    return option.alt(find(this.front, p), () => find(this.back, p))
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
