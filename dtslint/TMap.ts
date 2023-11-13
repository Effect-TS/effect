import { pipe } from "effect/Function"
import * as TMap from "effect/TMap"

declare const stringNumber: TMap.TMap<string, number>

// -----------------------------------------------------------------------------
// removeIf
// -----------------------------------------------------------------------------

// $ExpectType STM<never, never, [string, number][]>
TMap.removeIf(stringNumber, (key) => key === "aa")

// $ExpectType STM<never, never, [string, number][]>
TMap.removeIf(stringNumber, (key) => key === "aa", { discard: false })

// $ExpectType STM<never, never, [string, number][]>
pipe(stringNumber, TMap.removeIf((key) => key === "aa"))

// $ExpectType STM<never, never, [string, number][]>
pipe(stringNumber, TMap.removeIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<never, never, void>
TMap.removeIf(stringNumber, (key) => key === "aa", { discard: true })

// $ExpectType STM<never, never, void>
pipe(stringNumber, TMap.removeIf((key) => key === "aa", { discard: true }))

// -----------------------------------------------------------------------------
// retainIf
// -----------------------------------------------------------------------------

// $ExpectType STM<never, never, [string, number][]>
TMap.retainIf(stringNumber, (key) => key === "aa")

// $ExpectType STM<never, never, [string, number][]>
TMap.retainIf(stringNumber, (key) => key === "aa", { discard: false })

// $ExpectType STM<never, never, [string, number][]>
pipe(stringNumber, TMap.retainIf((key) => key === "aa"))

// $ExpectType STM<never, never, [string, number][]>
pipe(stringNumber, TMap.retainIf((key) => key === "aa", { discard: false }))

// $ExpectType STM<never, never, void>
TMap.retainIf(stringNumber, (key) => key === "aa", { discard: true })

// $ExpectType STM<never, never, void>
pipe(stringNumber, TMap.retainIf((key) => key === "aa", { discard: true }))
