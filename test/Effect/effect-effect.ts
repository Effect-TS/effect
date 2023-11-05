import { Effect } from "src/Effect"

export const test = Effect.succeed(1)

type test = Effect<never, never, 1>
