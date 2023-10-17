import { pipe } from "effect/Function"
import * as T from "effect/Tuple"

//
// tuple
//

// $ExpectType [string, number, boolean]
T.tuple("a", 1, true)

//
// appendElement
//

// $ExpectType [string, number, boolean]
pipe(T.tuple("a", 1), T.appendElement(true))
