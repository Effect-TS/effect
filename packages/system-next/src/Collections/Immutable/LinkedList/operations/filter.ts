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

import type { Predicate } from "../../../../Function"
import { unsafeCoerce } from "../../../../Function"
import type { LinkedList } from "../definition"
import { _Nil, Cons, cons, isNil } from "../definition"
import { unsafeHead } from "./unsafeHead"
import { unsafeTail } from "./unsafeTail"

/**
 * @ets_data_first filter_
 */
export function filter<A>(p: Predicate<A>): (self: LinkedList<A>) => LinkedList<A> {
  return (self) => filter_(self, p)
}

export function filter_<A>(self: LinkedList<A>, p: Predicate<A>): LinkedList<A> {
  return filterCommon_(self, p, false)
}

function noneIn<A>(
  l: LinkedList<A>,
  p: Predicate<A>,
  isFlipped: boolean
): LinkedList<A> {
  while (true) {
    if (isNil(l)) {
      return _Nil
    } else {
      if (p(l.head) !== isFlipped) {
        return allIn(l, l.tail, p, isFlipped)
      } else {
        l = l.tail
      }
    }
  }
}

function allIn<A>(
  start: LinkedList<A>,
  remaining: LinkedList<A>,
  p: Predicate<A>,
  isFlipped: boolean
): LinkedList<A> {
  while (true) {
    if (isNil(remaining)) {
      return start
    } else {
      if (p(remaining.head) !== isFlipped) {
        remaining = remaining.tail
      } else {
        return partialFill(start, remaining, p, isFlipped)
      }
    }
  }
}

function partialFill<A>(
  origStart: LinkedList<A>,
  firstMiss: LinkedList<A>,
  p: Predicate<A>,
  isFlipped: boolean
): LinkedList<A> {
  const newHead = cons<A>(unsafeHead(origStart)!, _Nil)
  let toProcess = unsafeTail(origStart)! as Cons<A>
  let currentLast = newHead

  while (!(toProcess === firstMiss)) {
    const newElem = cons(unsafeHead(toProcess)!, _Nil)
    currentLast.tail = newElem
    currentLast = unsafeCoerce(newElem)
    toProcess = unsafeCoerce(toProcess.tail)
  }

  let next = firstMiss.tail
  let nextToCopy: Cons<A> = unsafeCoerce(next)
  while (!isNil(next)) {
    const head = unsafeHead(next)!
    if (p(head) !== isFlipped) {
      next = next.tail
    } else {
      while (!(nextToCopy === next)) {
        const newElem = new Cons(unsafeHead(nextToCopy)!, _Nil)
        currentLast.tail = newElem
        currentLast = newElem
        nextToCopy = unsafeCoerce(nextToCopy.tail)
      }
      nextToCopy = unsafeCoerce(next.tail)
      next = next.tail
    }
  }

  if (!isNil(nextToCopy)) {
    currentLast.tail = nextToCopy
  }

  return newHead
}

function filterCommon_<A>(
  list: LinkedList<A>,
  p: Predicate<A>,
  isFlipped: boolean
): LinkedList<A> {
  return noneIn(list, p, isFlipped)
}
