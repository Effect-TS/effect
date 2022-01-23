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

export function unsafeLast<A>(self: List<A>): A | undefined {
  if (isNil(self)) {
    return undefined
  }
  let these = self
  let scout = self.tail
  while (!isNil(scout)) {
    these = scout
    scout = scout.tail
  }
  return these.head
}
