import { STMEffect } from "@effect-ts/core/stm/STM/definition/primitives";
import { Entry } from "@effect-ts/core/stm/STM/Entry";
import { emptyTodoMap } from "@effect-ts/core/stm/STM/Journal";
import { Versioned } from "@effect-ts/core/stm/STM/Versioned";
import { TRefInternal } from "@effect-ts/core/stm/TRef/operations/_internal/TRefInternal";

/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static ets/TRef/Ops make
 */
export function make<A>(a: LazyArg<A>): USTM<TRef<A>> {
  return new STMEffect((journal) => {
    const value = a();
    const versioned = new Versioned(value);
    const todo = new AtomicReference(emptyTodoMap);
    const tref = new TRefInternal(versioned, todo);
    journal.set(tref, Entry(tref, true));
    return tref;
  });
}
