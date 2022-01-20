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
import { prependAll_ } from "./prependAll"

/**
 * @ets_data_first concat_
 */
export function concat<B>(
  that: LinkedList<B>
): <A>(self: LinkedList<A>) => LinkedList<A | B> {
  return (self) => concat_(self, that)
}

export function concat_<A, B>(
  self: LinkedList<A>,
  that: LinkedList<B>
): LinkedList<A | B> {
  return prependAll_(that, self)
}
