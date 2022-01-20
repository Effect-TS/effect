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
import { _Nil, cons, isNil } from "../definition"

/**
 * @ets_data_first take_
 */
export function take(n: number): <A>(self: LinkedList<A>) => LinkedList<A> {
  return (self) => take_(self, n)
}

export function take_<A>(self: LinkedList<A>, n: number): LinkedList<A> {
  if (isNil(self) || n <= 0) {
    return _Nil
  } else {
    const h = cons(self.head, _Nil)
    let t = h
    let rest = self.tail
    let i = 1
    while (i < n) {
      if (isNil(rest)) {
        return self
      }
      i += 1
      const nx = cons(rest.head, _Nil)
      t.tail = nx
      t = nx
      rest = rest.tail
    }
    return h
  }
}
