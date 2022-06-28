import { emptyTodoMap } from "@effect/core/stm/STM/Journal"
import { Versioned } from "@effect/core/stm/STM/Versioned"
import { TRefInternal } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"

/**
 * Unsafely makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static effect/core/stm/TRef.Ops unsafeMake
 */
export function unsafeMake<A>(value: A): TRef<A> {
  const versioned = new Versioned(value)
  const todo = new AtomicReference(emptyTodoMap)
  return new TRefInternal(versioned, todo)
}
