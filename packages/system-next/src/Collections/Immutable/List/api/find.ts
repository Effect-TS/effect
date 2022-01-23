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
import * as O from "../../../../Option"
import type { List } from "../core"
import { isNil } from "../core"

/**
 * @ets_data_first find_
 */
export function find<A>(p: Predicate<A>): (self: List<A>) => O.Option<A> {
  return (self) => find_(self, p)
}

export function find_<A>(self: List<A>, p: Predicate<A>): O.Option<A> {
  let these = self
  while (!isNil(these)) {
    if (p(these.head)) {
      return O.some(these.head)
    }
    these = these.tail
  }
  return O.none
}
