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

import type { LinkedList } from "../definition"
import { _Nil, Cons } from "../definition"

/**
 * Constructs a new `LinkedList` from an `Iterable`
 */
export function from<A>(prefix: Iterable<A>): LinkedList<A> {
  const iter = prefix[Symbol.iterator]()
  let a: IteratorResult<A>
  if (!(a = iter.next()).done) {
    const result = new Cons(a.value, _Nil)
    let curr = result
    while (!(a = iter.next()).done) {
      const temp = new Cons(a.value, _Nil)
      curr.tail = temp
      curr = temp
    }
    return result
  } else {
    return _Nil
  }
}
