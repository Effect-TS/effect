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
import { isNil } from "../definition"

/**
 * @dataFirst reduce_
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (self: LinkedList<A>) => B {
  return (self) => reduce_(self, b, f)
}

export function reduce_<A, B>(self: LinkedList<A>, b: B, f: (b: B, a: A) => B): B {
  let acc = b
  let these = self
  while (!isNil(these)) {
    acc = f(acc, these.head)
    these = these.tail
  }
  return acc
}
