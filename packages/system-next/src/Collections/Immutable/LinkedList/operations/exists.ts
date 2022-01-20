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

import type { Predicate } from "../../../../Function"
import type { LinkedList } from "../definition"
import { isNil } from "../definition"

export function exists_<A>(self: LinkedList<A>, p: Predicate<A>): boolean {
  let these = self
  while (!isNil(these)) {
    if (p(these.head)) {
      return true
    }
    these = these.tail
  }
  return false
}

/**
 * @ets_data_first exists_
 */
export function exists<A>(p: Predicate<A>): (self: LinkedList<A>) => boolean {
  return (self) => exists_(self, p)
}
