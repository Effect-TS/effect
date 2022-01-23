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
import { cons, isNil } from "../core"

/**
 * @ets_data_first prependAll_
 */
export function prependAll<B>(prefix: List<B>): <A>(self: List<A>) => List<A | B> {
  return (self) => prependAll_(self, prefix)
}

export function prependAll_<A, B>(self: List<A>, prefix: List<B>): List<A | B> {
  if (isNil(self)) {
    return prefix
  } else if (isNil(prefix)) {
    return self
  } else {
    const result = cons<A | B>(prefix.head, self)
    let curr = result
    let that = prefix.tail
    while (!isNil(that)) {
      const temp = cons<A | B>(that.head, self)
      curr.tail = temp
      curr = temp
      that = that.tail
    }
    return result
  }
}
