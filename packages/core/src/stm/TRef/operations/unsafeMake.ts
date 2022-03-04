import { AtomicReference } from "../../../support/AtomicReference"
import { emptyTodoMap } from "../../STM/Journal"
import { Versioned } from "../../STM/Versioned"
import { Atomic } from "../Atomic/Atomic"
import type { TRef } from "../definition"

/**
 * Unsafely makes a new `XTRef` that is initialized to the specified value.
 *
 * @tsplus static ets/XTRefOps unsafeMake
 */
export function unsafeMake<A>(a: A): TRef<A> {
  const value = a
  const versioned = new Versioned(value)
  const todo = new AtomicReference(emptyTodoMap)
  return new Atomic(versioned, todo)
}
