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
import { empty } from "./empty"
import { prepend_ } from "./prepend"

/**
 * Reverses a `LinkedList`, returning a new `LinkedList`
 */
export function reverse<A>(self: LinkedList<A>): LinkedList<A> {
  let result = empty<A>()
  let these = self
  while (!isNil(these)) {
    result = prepend_(result, these.head)
    these = these.tail
  }
  return result
}
