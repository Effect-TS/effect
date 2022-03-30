import type { LazyArg } from "../../../data/Function"
import { AtomicReference } from "../../../support/AtomicReference"
import type { USTM } from "../../STM"
import { STMEffect } from "../../STM"
import { Entry } from "../../STM/Entry"
import { emptyTodoMap } from "../../STM/Journal"
import { Versioned } from "../../STM/Versioned"
import type { TRef } from "../definition"
import { TRefInternal } from "./_internal/TRefInternal"

/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static ets/TRefOps make
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
