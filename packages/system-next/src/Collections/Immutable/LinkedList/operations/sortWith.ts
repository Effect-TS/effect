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

import type { Ordering } from "../../../../Ordering"
import { ListBuffer } from "../../../Mutable/ListBuffer"
import type { LinkedList } from "../definition"
import { isNil, length } from "../definition"
import { unsafeHead } from "./unsafeHead"

/**
 * @ets_data_first sortWith_
 */
export function sortWith<A>(
  compare: (x: A, y: A) => Ordering
): (self: LinkedList<A>) => LinkedList<A> {
  return (self) => sortWith_(self, compare)
}

export function sortWith_<A>(
  self: LinkedList<A>,
  compare: (x: A, y: A) => Ordering
): LinkedList<A> {
  const len = length(self)
  const b = new ListBuffer<A>()
  if (len === 1) {
    b.append(unsafeHead(self)!)
  } else if (len > 1) {
    const arr = new Array<[number, A]>(len)
    copyToArrayWithIndex(self, arr)
    arr.sort(([i, x], [j, y]) => {
      const c = compare(x, y)
      return c !== 0 ? c : i < j ? -1 : 1
    })
    for (let i = 0; i < len; i++) {
      b.append(arr[i]![1])
    }
  }
  return b.toList
}

function copyToArrayWithIndex<A>(list: LinkedList<A>, arr: Array<[number, A]>): void {
  let these = list
  let i = 0
  while (!isNil(these)) {
    arr[i] = [i, these.head]
    these = these.tail
    i++
  }
}
