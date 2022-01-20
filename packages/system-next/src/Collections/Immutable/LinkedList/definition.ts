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

export class Cons<A> implements Iterable<A> {
  readonly _tag = "Cons"
  constructor(readonly head: A, public tail: LinkedList<A>) {}

  [Symbol.iterator](): Iterator<A> {
    let done = false
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let these: LinkedList<A> = this
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
}

export class Nil<A> implements Iterable<A> {
  readonly _tag = "Nil";
  [Symbol.iterator](): Iterator<A> {
    return {
      next() {
        return { done: true, value: undefined }
      }
    }
  }
}

export const _Nil = new Nil<never>()

export type LinkedList<A> = Cons<A> | Nil<A>

export function nil<A>(): Nil<A> {
  return _Nil
}

export function cons<A>(head: A, tail: LinkedList<A>): Cons<A> {
  return new Cons(head, tail)
}

export function isNil<A>(self: LinkedList<A>): self is Nil<A> {
  return self._tag === "Nil"
}

export function isCons<A>(self: LinkedList<A>): self is Cons<A> {
  return self._tag === "Cons"
}
