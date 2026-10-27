import { Effect } from "effect"
import * as Statement from "effect/sql/Statement"

// Durable Object SQLite binds at most 100 parameters per statement, the lowest
// limit of a supported database.
export const maxParameters = 100

// Rejects statements binding more than `maxParameters`, so oversized batches
// fail on any database and build.
export const limitParameters = Effect.provideService(Statement.CurrentTransformer, (statement) => {
  const parameters = statement.compile()[1].length
  return parameters > maxParameters
    ? Effect.die(`statement binds ${parameters} parameters`)
    : Effect.succeed(statement)
})
