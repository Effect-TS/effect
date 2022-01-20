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
 * @ets_data_first forEach_
 */
export function forEach<A, U>(f: (a: A) => U): (self: LinkedList<A>) => void {
  return (list) => forEach_(list, f)
}

export function forEach_<A, U>(self: LinkedList<A>, f: (a: A) => U): void {
  let these = self
  while (!isNil(these)) {
    f(these.head)
    these = these.tail
  }
}
