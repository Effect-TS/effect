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
import { cons, isNil } from "../definition"

/**
 * @ets_data_first prependAll_
 */
export function prependAll<B>(
  prefix: LinkedList<B>
): <A>(self: LinkedList<A>) => LinkedList<A | B> {
  return (self) => prependAll_(self, prefix)
}

export function prependAll_<A, B>(
  self: LinkedList<A>,
  prefix: LinkedList<B>
): LinkedList<A | B> {
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
