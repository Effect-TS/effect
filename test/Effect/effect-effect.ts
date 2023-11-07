import * as it from "effect-test/utils/extend"
// import * as Effect from "effect/Effect"
import * as Effect from "effect/Effect"

export type TestType = Effect<never, never, number>

it.effect("works", () =>
  Effect.succeed(1)
    .pipe(
      Effect.flatMap((i) => Effect.sync(() => console.log("the answer is: " + i)))
    ))

export const a: Effect<string, string, void> = Effect.succeed("hello")

export const effect = Effect.succeed("world").pipe(Effect.runSync)
