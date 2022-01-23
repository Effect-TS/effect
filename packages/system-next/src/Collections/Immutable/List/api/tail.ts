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

import * as O from "../../../../Option"
import type { List } from "../core"
import { isNil } from "../core"

export function tail<A>(self: List<A>): O.Option<List<A>> {
  return isNil(self) ? O.none : O.some(self.tail)
}
