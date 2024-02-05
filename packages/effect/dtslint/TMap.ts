import { pipe } from "effect/Function"
import * as TMap from "effect/TMap"

declare const stringNumber: TMap.TMap<string, number>

// -----------------------------------------------------------------------------
// removeIf
// -----------------------------------------------------------------------------

// $ExpectType STM<[string, number][], never, never>
TMap.removeIf(stringNumber, (key) => key === "aa")

// $ExpectType STM<[string, number][], never, never>
TMap.removeIf(stringNumber, (key) => key === "aa", { discard: false })

// $ExpectType STM<[string, number][], never, never>
pipe(stringNumber, TMap.removeIf((key) => key === "aa"))

// $ExpectType STM<[string, number][], never, never>
pipe(stringNumber, TMap.removeIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<void, never, never>
TMap.removeIf(stringNumber, (key) => key === "aa", { discard: true })

// $ExpectType STM<void, never, never>
pipe(stringNumber, TMap.removeIf((key) => key === "aa", { discard: true }))

// -----------------------------------------------------------------------------
// retainIf
// -----------------------------------------------------------------------------

// $ExpectType STM<[string, number][], never, never>
TMap.retainIf(stringNumber, (key) => key === "aa")

// $ExpectType STM<[string, number][], never, never>
TMap.retainIf(stringNumber, (key) => key === "aa", { discard: false })

// $ExpectType STM<[string, number][], never, never>
pipe(stringNumber, TMap.retainIf((key) => key === "aa"))

// $ExpectType STM<[string, number][], never, never>
pipe(stringNumber, TMap.retainIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<void, never, never>
TMap.retainIf(stringNumber, (key) => key === "aa", { discard: true })

// $ExpectType STM<void, never, never>
pipe(stringNumber, TMap.retainIf((key) => key === "aa", { discard: true }))
