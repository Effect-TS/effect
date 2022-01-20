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

export function unsafeTail<A>(self: LinkedList<A>): LinkedList<A> | undefined {
  if (isNil(self)) {
    return undefined
  }
  return self.tail
}
