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
import { _Nil, Cons } from "../definition"

/**
 * Inserts an element at the beginning of a `LinkedList`, returning a new `LinkedList`
 *
 * @ets_data_first prepend_
 */
export function prepend<B>(elem: B): <A>(self: LinkedList<A>) => LinkedList<A | B> {
  return (self) => prepend_(self, elem)
}

/**
 * Inserts an element at the beginning of a `LinkedList`, returning a new `LinkedList`
 */
export function prepend_<A, B>(self: LinkedList<A>, elem: B): LinkedList<A | B> {
  return new Cons<A | B>(elem, self)
}
