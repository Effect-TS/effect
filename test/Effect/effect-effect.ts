import * as it from "effect-test/utils/extend"
import { Effect } from "effect/Effect"
import type { HashMap } from "../../src/index.js"

export type TestType = Effect<never, never, number>

it.effect("works", () =>
  Effect.succeed(1)
    .pipe(
      Effect.flatMap((i) => Effect.sync(() => console.log("the answer is: " + i)))
    ))

declare const a: HashMap.HashMap<string, number>
export const b: HashMap<string, number> = a

declare const a2: HashMap<string, number>
export const bb2: HashMap.HashMap<string, number> = a2
