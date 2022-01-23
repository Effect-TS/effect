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

import type { List } from "../core"
import { _Nil, Cons } from "../core"

/**
 * Constructs a new `List` from an `Iterable`
 */
export function from<A>(prefix: Iterable<A>): List<A> {
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
