import * as O from "../Option"
import { chain_, effectTotal, succeed } from "./core"
import type { SyncE } from "./effect"
import { fail } from "./fail"

/**
 * Lifts an `Option` into a `Effect` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(o: () => O.Option<A>): SyncE<O.Option<never>, A> {
  return chain_(effectTotal(o), (op) =>
    op._tag === "None" ? fail(O.none) : succeed(op.value)
  )
}
