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
import type { LinkedList } from "../definition"
import { isNil } from "../definition"
import { unsafeLast } from "./unsafeLast"

export function last<A>(self: LinkedList<A>): O.Option<A> {
  return isNil(self) ? O.none : O.some(unsafeLast(self)!)
}
