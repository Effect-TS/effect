// No Effect.gen - should not be transformed
import { Effect } from "effect"

export const program = Effect.succeed(42).pipe(
  Effect.map((n) => n * 2)
)
