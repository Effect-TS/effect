import { emptyTodoMap, STMEffect } from "@effect/core/stm/STM/definition/primitives"
import { Entry } from "@effect/core/stm/STM/Entry"
import { Versioned } from "@effect/core/stm/STM/Versioned"
import { TRefInternal } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"

/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static effect/core/stm/TRef.Ops make
 */
export function make<A>(a: LazyArg<A>): USTM<TRef<A>> {
  return new STMEffect((journal) => {
    const value = a()
    const versioned = new Versioned(value)
    const todo = new AtomicReference(emptyTodoMap)
    const tref = new TRefInternal(versioned, todo)
    journal.set(tref, Entry(tref, true))
    return tref
  })
}
