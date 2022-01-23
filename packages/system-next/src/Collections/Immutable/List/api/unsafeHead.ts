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

export function unsafeHead<A>(self: List<A>): A | undefined {
  if (isNil(self)) {
    return undefined
  }
  return self.head
}
