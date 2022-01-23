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
import { _Nil, Cons } from "../core"

/**
 * Inserts an element at the beginning of a `List`, returning a new `List`
 *
 * @ets_data_first prepend_
 */
export function prepend<B>(elem: B): <A>(self: List<A>) => List<A | B> {
  return (self) => prepend_(self, elem)
}

/**
 * Inserts an element at the beginning of a `List`, returning a new `List`
 */
export function prepend_<A, B>(self: List<A>, elem: B): List<A | B> {
  return new Cons<A | B>(elem, self)
}
