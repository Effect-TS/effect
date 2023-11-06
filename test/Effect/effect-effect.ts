import * as it from "effect-test/utils/extend"
import { Effect } from "effect/Effect"

export type TestType = Effect<never, never, number>

it.effect("works", () =>
  Effect.succeed(1)
    .pipe(
      Effect.flatMap((i) => Effect.sync(() => console.log("the answer is: " + i)))
    ))
