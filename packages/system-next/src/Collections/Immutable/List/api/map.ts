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
import { _Nil, cons, isNil } from "../core"

/**
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): (self: List<A>) => List<B> {
  return (self) => map_(self, f)
}

export function map_<A, B>(self: List<A>, f: (a: A) => B): List<B> {
  if (isNil(self)) {
    return self as List<B>
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
