import { pipe } from "effect/Function"
import * as TSet from "effect/TSet"

declare const string: TSet.TSet<string>

// -----------------------------------------------------------------------------
// removeIf
// -----------------------------------------------------------------------------

// $ExpectType STM<string[], never, never>
TSet.removeIf(string, (key) => key === "aa")

// $ExpectType STM<string[], never, never>
TSet.removeIf(string, (key) => key === "aa", { discard: false })

// $ExpectType STM<string[], never, never>
pipe(string, TSet.removeIf((key) => key === "aa"))

// $ExpectType STM<string[], never, never>
pipe(string, TSet.removeIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<void, never, never>
TSet.removeIf(string, (key) => key === "aa", { discard: true })

// $ExpectType STM<void, never, never>
pipe(string, TSet.removeIf((key) => key === "aa", { discard: true }))

// -----------------------------------------------------------------------------
// retainIf
// -----------------------------------------------------------------------------

// $ExpectType STM<string[], never, never>
TSet.retainIf(string, (key) => key === "aa")

// $ExpectType STM<string[], never, never>
TSet.retainIf(string, (key) => key === "aa", { discard: false })

// $ExpectType STM<string[], never, never>
pipe(string, TSet.retainIf((key) => key === "aa"))

// $ExpectType STM<string[], never, never>
pipe(string, TSet.retainIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<void, never, never>
TSet.retainIf(string, (key) => key === "aa", { discard: true })

// $ExpectType STM<void, never, never>
pipe(string, TSet.retainIf((key) => key === "aa", { discard: true }))
