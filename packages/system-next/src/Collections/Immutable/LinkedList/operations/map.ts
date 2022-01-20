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
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): (self: LinkedList<A>) => LinkedList<B> {
  return (self) => map_(self, f)
}

export function map_<A, B>(self: LinkedList<A>, f: (a: A) => B): LinkedList<B> {
  if (isNil(self)) {
    return self as LinkedList<B>
  } else {
    const h = cons(f(self.head), _Nil)
    let t = h
    let rest = self.tail
    while (!isNil(rest)) {
      const nx = cons(f(rest.head), _Nil)
      t.tail = nx
      t = nx
      rest = rest.tail
    }
    return h
  }
}
