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
import { _Nil } from "../core"

/**
 * Returns the empty `List`
 */
export function empty<A>(): List<A> {
  return _Nil
}
