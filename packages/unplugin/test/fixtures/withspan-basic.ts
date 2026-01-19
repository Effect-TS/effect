// Basic Effect.withSpan usage - should inject source location attributes
import { Effect } from "effect"

// Data-last style (curried)
export const program1 = Effect.succeed(42).pipe(
  Effect.withSpan("myOperation")
)

// Data-first style
export const program2 = Effect.withSpan(
  Effect.succeed(42),
  "myOperation"
)

// With existing options
export const program3 = Effect.succeed(42).pipe(
  Effect.withSpan("myOperation", { root: true })
)

// With existing attributes
export const program4 = Effect.succeed(42).pipe(
  Effect.withSpan("myOperation", {
    attributes: { "custom.attr": "value" }
  })
)
