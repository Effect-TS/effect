import { emptyTodoMap } from "@effect-ts/core/stm/STM/Journal";
import { Versioned } from "@effect-ts/core/stm/STM/Versioned";
import { TRefInternal } from "@effect-ts/core/stm/TRef/operations/_internal/TRefInternal";

/**
 * Unsafely makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static ets/TRef/Ops unsafeMake
 */
export function unsafeMake<A>(a: A): TRef<A> {
  const value = a;
  const versioned = new Versioned(value);
  const todo = new AtomicReference(emptyTodoMap);
  return new TRefInternal(versioned, todo);
}
