/**
 * Redis transactions on dedicated scoped sessions.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import type { Affinity, RedisClient } from "./RedisClient.ts"
import { argumentText, type RedisCommand } from "./RedisCommand.ts"
import type { RedisConnection } from "./RedisConnection.ts"
import { RedisError } from "./RedisError.ts"

/**
 * Executes commands atomically on a dedicated connection without automatic retry.
 *
 * **Details**
 *
 * Individual EXEC errors are returned in their result positions. A null result
 * indicates a WATCH conflict. `watch` runs before MULTI on the same session.
 * In Cluster, supply a key affinity and use keys in that slot.
 *
 * **Gotchas**
 *
 * Losing the EXEC reply leaves the transaction outcome uncertain. This helper
 * never replays the transaction. Cross-slot transactions are unsupported.
 * Transaction and session reset commands are rejected before opening a session.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const execute = <Commands extends ReadonlyArray<RedisCommand<any>>>(
  client: RedisClient,
  commands: Commands,
  options?: {
    readonly affinity?: Affinity
    readonly watch?: (connection: RedisConnection) => Effect.Effect<void, RedisError>
  }
): Effect.Effect<
  {
    readonly [K in keyof Commands]: Result.Result<Commands[K] extends RedisCommand<infer A> ? A : never, RedisError>
  } | null,
  RedisError
> =>
  Effect.scoped(Effect.gen(function*() {
    for (const command of commands) {
      const name = argumentText(command.arguments[0]).toUpperCase()
      if (
        name === "MULTI" || name === "EXEC" || name === "DISCARD" || name === "WATCH" || name === "UNWATCH" ||
        name === "RESET" || name === "QUIT"
      ) {
        return yield* Effect.fail(
          new RedisError({
            reason: "Routing",
            message: "Transaction commands cannot alter transaction control or close the session",
            outcome: "NotSent"
          })
        )
      }
    }
    const connection = yield* client.reserve(options?.affinity)
    if (options?.watch !== undefined) yield* options.watch(connection)
    yield* connection.execute(["MULTI"])
    for (const command of commands) yield* connection.execute(command.arguments, command.routing)
    let reply = yield* connection.execute(["EXEC"])
    while (reply._tag === "Attribute") reply = reply.value
    if (reply._tag === "Null") return null
    if (reply._tag !== "Array" || reply.values.length !== commands.length) {
      return yield* Effect.fail(
        new RedisError({ reason: "Protocol", message: "Redis EXEC returned an unexpected result" })
      )
    }
    return reply.values.map((value, index) => {
      let unwrapped = value
      while (unwrapped._tag === "Attribute") unwrapped = unwrapped.value
      return unwrapped._tag === "Error"
        ? Result.fail(new RedisError({ reason: "Server", message: unwrapped.message, code: unwrapped.code }))
        : commands[index].decode(value)
    }) as any
  }))
