import * as it from "effect-test/utils/extend"
// import * as Effect from "effect/Effect"
import { Effect, Schedule } from "effect"

import { Option } from "effect"

export type TestType = Effect<never, never, number>

it.effect("works", () =>
  Effect.succeed(1)
    .pipe(
      Effect.flatMap((i) => Effect.sync(() => console.log("the answer is: " + i)))
    ))

export const a: Effect<string, string, void> = Effect.succeed("hello")

export const effect = Effect.succeed("world").pipe(Effect.runSync)

export const ao = Option.none()
export const bo = Option.some(1)
export const co = bo.pipe((_) => Option.map((_) => 2)(_))

export const as = Schedule.identity()
export const bs = as.pipe((_) => Schedule.map((_) => 2)(_))
