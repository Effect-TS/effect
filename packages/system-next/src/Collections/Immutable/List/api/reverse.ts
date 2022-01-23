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
import { isNil } from "../core"
import { empty } from "./empty"
import { prepend_ } from "./prepend"

/**
 * Reverses a `List`, returning a new `List`
 */
export function reverse<A>(self: List<A>): List<A> {
  let result = empty<A>()
  let these = self
  while (!isNil(these)) {
    result = prepend_(result, these.head)
    these = these.tail
  }
  return result
}
