import { AtomicReference } from "../../../support/AtomicReference"
import { emptyTodoMap } from "../../STM/Journal"
import { Versioned } from "../../STM/Versioned"
import type { TRef } from "../definition"
import { TRefInternal } from "./_internal/TRefInternal"

/**
 * Unsafely makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static ets/TRefOps unsafeMake
 */
export function unsafeMake<A>(a: A): TRef<A> {
  const value = a
  const versioned = new Versioned(value)
  const todo = new AtomicReference(emptyTodoMap)
  return new TRefInternal(versioned, todo)
}
