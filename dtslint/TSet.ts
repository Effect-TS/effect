import { pipe } from "effect/Function"
import * as TSet from "effect/TSet"

declare const string: TSet.TSet<string>

// -----------------------------------------------------------------------------
// removeIf
// -----------------------------------------------------------------------------

// $ExpectType STM<never, never, string[]>
TSet.removeIf(string, (key) => key === "aa")

// $ExpectType STM<never, never, string[]>
TSet.removeIf(string, (key) => key === "aa", { discard: false })

// $ExpectType STM<never, never, string[]>
pipe(string, TSet.removeIf((key) => key === "aa"))

// $ExpectType STM<never, never, string[]>
pipe(string, TSet.removeIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<never, never, void>
TSet.removeIf(string, (key) => key === "aa", { discard: true })

// $ExpectType STM<never, never, void>
pipe(string, TSet.removeIf((key) => key === "aa", { discard: true }))

// -----------------------------------------------------------------------------
// retainIf
// -----------------------------------------------------------------------------

// $ExpectType STM<never, never, string[]>
TSet.retainIf(string, (key) => key === "aa")

// $ExpectType STM<never, never, string[]>
TSet.retainIf(string, (key) => key === "aa", { discard: false })

// $ExpectType STM<never, never, string[]>
pipe(string, TSet.retainIf((key) => key === "aa"))

// $ExpectType STM<never, never, string[]>
pipe(string, TSet.retainIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<never, never, void>
TSet.retainIf(string, (key) => key === "aa", { discard: true })

// $ExpectType STM<never, never, void>
pipe(string, TSet.retainIf((key) => key === "aa", { discard: true }))
