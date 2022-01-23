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

import { IndexOutOfBoundsException } from "../../GlobalExceptions/IndexOutOfBoundsException"
import { NoSuchElementException } from "../../GlobalExceptions/NoSuchElementException"
import { reduce_ } from "../Immutable/List/api/reduce"
import { unsafeTail } from "../Immutable/List/api/unsafeTail"
import * as L from "../Immutable/List/core"

export class ListBuffer<A> implements Iterable<A> {
  private first: L.List<A> = L._Nil
  private last0: L.Cons<A> | undefined = undefined
  private len = 0;

  [Symbol.iterator](): Iterator<A> {
    return this.first[Symbol.iterator]()
  }

  static empty<A>(): ListBuffer<A> {
    return new ListBuffer()
  }

  static from<A>(as: Iterable<A>): ListBuffer<A> {
    const buf = new ListBuffer<A>()
    for (const a of as) {
      buf.append(a)
    }
    return buf
  }

  get length(): number {
    return this.len
  }

  get isEmpty(): boolean {
    return this.len === 0
  }

  get unsafeHead(): A | undefined {
    if (this.isEmpty) {
      return undefined
    }
    return (this.first as L.Cons<A>).head
  }

  get unsafeTail(): L.List<A> | undefined {
    if (this.isEmpty) {
      return undefined
    }
    return (this.first as L.Cons<A>).tail
  }

  append(elem: A): this {
    const last1 = new L.Cons(elem, L._Nil)
    if (this.len === 0) {
      this.first = last1
    } else {
      this.last0!.tail = last1
    }
    this.last0 = last1
    this.len += 1
    return this
  }

  prepend(elem: A): this {
    this.insert(0, elem)
    return this
  }

  unprepend(): A {
    if (this.isEmpty) {
      throw new NoSuchElementException()
    }
    const h = (this.first as L.Cons<A>).head
    this.first = (this.first as L.Cons<A>).tail
    this.len -= 1
    return h
  }

  get toList(): L.List<A> {
    return this.first
  }

  insert(idx: number, elem: A): this {
    if (idx < 0 || idx > this.len) {
      throw new IndexOutOfBoundsException(
        `${idx} is out of bounds (min 0, max ${this.len - 1})`
      )
    }
    if (idx === this.len) {
      this.append(elem)
    } else {
      const p = this.locate(idx)
      const nx = L.cons(elem, this.getNext(p))
      if (p === undefined) {
        this.first = nx
      } else {
        ;(p as L.Cons<A>).tail = nx
      }
      this.len += 1
    }
    return this
  }

  reduce<B>(b: B, f: (b: B, a: A) => B): B {
    return reduce_(this.first, b, f)
  }

  private getNext(p: L.List<A> | undefined): L.List<A> {
    if (p === undefined) {
      return this.first
    } else {
      return unsafeTail(p)!
    }
  }

  private locate(i: number): L.List<A> | undefined {
    if (i === 0) {
      return undefined
    } else if (i === this.len) {
      return this.last0
    } else {
      let p = this.first
      for (let j = i - 1; j > 0; j--) {
        p = unsafeTail(p)!
      }
      return p
    }
  }
}
