// A generic shape that does not name its key gets a derived signature with its type parameter at its constraint.
// The deliberate mismatch below makes tsc print the derived result type.
import type * as Effect from "effect/Effect"
import { Operation } from "../../src/Operation.ts"

export const parse = Operation<<A>(decode: (input: string) => A, input: string) => Effect.Effect<A>>()("test/parse")

export const result: string = parse(Number, "42")
