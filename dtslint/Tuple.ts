import { pipe } from "effect/Function"
import * as T from "effect/Tuple"

// -------------------------------------------------------------------------------------
// make
// -------------------------------------------------------------------------------------

// $ExpectType [string, number, boolean]
T.make("a", 1, true)

// -------------------------------------------------------------------------------------
// appendElement
// -------------------------------------------------------------------------------------

// $ExpectType [string, number, boolean]
pipe(T.make("a", 1), T.appendElement(true))

// $ExpectType [string, number, boolean]
T.appendElement(T.make("a", 1), true)
