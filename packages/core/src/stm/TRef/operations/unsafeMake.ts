import { emptyTodoMap } from "@effect/core/stm/STM/definition/primitives"
import { Versioned } from "@effect/core/stm/STM/Versioned"
import { TRefInternal } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * Unsafely makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static effect/core/stm/TRef.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMake<A>(value: A): TRef<A> {
  const versioned = Versioned(value)
  const todo = MutableRef.make(emptyTodoMap)
  return new TRefInternal(versioned, todo)
}
