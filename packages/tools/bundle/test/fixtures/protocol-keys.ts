import * as Cause from "effect/Cause"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"

// Reaches the protocol methods of Cause through their keys alone, never through
// Equal.equals or Hash.hash.
export const equal = Cause.fail({ n: 1 })[Equal.symbol](Cause.fail({ n: 1 }))
export const sameHash = Cause.fail({ n: 1 })[Hash.symbol]() === Cause.fail({ n: 1 })[Hash.symbol]()
