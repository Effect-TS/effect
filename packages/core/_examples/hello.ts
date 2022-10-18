export const program = pipe(
  Effect.succeed(0),
  Effect.$.flatMap((n) => Effect.succeed(n + 1))
)
