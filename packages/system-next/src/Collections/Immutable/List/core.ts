/*
 * This file is ported from
 *
 * Scala (https://www.scala-lang.org)
 *
 * Copyright EPFL and Lightbend, Inc.
 *
 * Licensed under Apache License 2.0
 * (http://www.apache.org/licenses/LICENSE-2.0).
 */
import * as St from "../../../Structural"
import type { HasEquals } from "../../../Structural/HasEquals"

export class Cons<A> implements Iterable<A>, HasEquals {
  readonly _tag = "Cons"
  constructor(readonly head: A, public tail: List<A>) {}

  [Symbol.iterator](): Iterator<A> {
    let done = false
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let these: List<A> = this
    return {
      next() {
        if (done) {
          return this.return!()
        }
        if (these._tag === "Nil") {
          done = true
          return this.return!()
        }
        const value: A = these.head
        these = these.tail
        return { done, value }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
        }
        return { done: true, value }
      }
    }
  }

  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Cons && equalsWith_(this, that, St.equals)
  }
}

export class Nil<A> implements Iterable<A>, HasEquals {
  readonly _tag = "Nil";
  [Symbol.iterator](): Iterator<A> {
    return {
      next() {
        return { done: true, value: undefined }
      }
    }
  }

  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Nil
  }
}

export const _Nil = new Nil<never>()

export type List<A> = Cons<A> | Nil<A>

export function nil<A>(): Nil<A> {
  return _Nil
}

export function cons<A>(head: A, tail: List<A>): Cons<A> {
  return new Cons(head, tail)
}

export function isNil<A>(self: List<A>): self is Nil<A> {
  return self._tag === "Nil"
}

export function isCons<A>(self: List<A>): self is Cons<A> {
  return self._tag === "Cons"
}

/**
 * Returns the number of elements contained in a `List`
 */
export function length<A>(self: List<A>): number {
  let these = self
  let len = 0
  while (!isNil(these)) {
    len += 1
    these = these.tail
  }
  return len
}

/**
 * @ets_data_first equalsWith_
 */
export function equalsWith<A>(
  that: List<A>,
  f: (a: A, b: A) => boolean
): (self: List<A>) => boolean {
  return (self) => equalsWith_(self, that, f)
}

export function equalsWith_<A>(
  self: List<A>,
  that: List<A>,
  f: (a: A, b: A) => boolean
): boolean {
  if (self === that) {
    return true
  } else if (length(self) !== length(that)) {
    return false
  } else {
    const i0 = self[Symbol.iterator]()
    const i1 = that[Symbol.iterator]()
    let a: IteratorResult<A>
    let b: IteratorResult<A>
    while (!(a = i0.next()).done && !(b = i1.next()).done) {
      if (!f(a.value, b.value)) {
        return false
      }
    }
    return true
  }
}
