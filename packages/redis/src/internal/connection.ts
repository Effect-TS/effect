// Internal implementation.
import type * as Result from "effect/Result"
import type { RedisConnection } from "../RedisConnection.ts"
import type { RedisError } from "../RedisError.ts"
import type { Argument, Reply } from "../RedisProtocol.ts"

export type Submit = (
  args: ReadonlyArray<Argument>,
  onResult: (result: Result.Result<Reply, RedisError>) => void
) => () => void

// Concrete sessions without deadlines can admit and encode a command in the
// client's own callback, preserving snapshots without another Effect boundary.
const submissions = new WeakMap<RedisConnection, Submit>()

export const register = (connection: RedisConnection, submit: Submit): void => {
  submissions.set(connection, submit)
}

export const get = (connection: RedisConnection): Submit | undefined => submissions.get(connection)
