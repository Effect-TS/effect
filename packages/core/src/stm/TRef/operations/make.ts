import { emptyTodoMap, STMEffect } from "@effect/core/stm/STM/definition/primitives"
import { Entry } from "@effect/core/stm/STM/Entry"
import { Versioned } from "@effect/core/stm/STM/Versioned"
import { TRefInternal } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static effect/core/stm/TRef.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(a: LazyArg<A>): USTM<TRef<A>> {
  return new STMEffect((journal) => {
    const value = a()
    const versioned = Versioned(value)
    const todo = MutableRef.make(emptyTodoMap)
    const tref = new TRefInternal(versioned, todo)
    journal.set(tref, Entry(tref, true))
    return tref
  })
}
