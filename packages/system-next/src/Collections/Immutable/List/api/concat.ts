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
import { prependAll_ } from "./prependAll"

/**
 * @ets_data_first concat_
 */
export function concat<B>(that: List<B>): <A>(self: List<A>) => List<A | B> {
  return (self) => concat_(self, that)
}

export function concat_<A, B>(self: List<A>, that: List<B>): List<A | B> {
  return prependAll_(that, self)
}
