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
import type { Reply } from "./RedisProtocol.ts"

const unwrap = (reply: Reply): Reply => {
  while (reply._tag === "Attribute") reply = reply.value
  return reply
}

/**
 * Executes commands atomically on a dedicated connection without automatic retry.
 *
 * **Details**
 *
 * Individual EXEC errors are returned in their result positions. A null result
 * indicates a WATCH conflict. `watch` runs before MULTI on the same session.
 * MULTI, the queued commands, and EXEC are submitted together without waiting
 * for intermediate replies.
 * In Cluster, supply a key affinity and use keys in that slot.
 *
 * **Gotchas**
 *
 * Losing the EXEC reply leaves the transaction outcome uncertain. This helper
 * never replays the transaction. Cross-slot transactions are unsupported.
 * Transaction and session reset commands are rejected before opening a session.
 * The server must permit MULTI. If it rejects MULTI, subsequent commands may
 * execute outside a transaction and the failure has an unknown outcome.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const execute = <Commands extends ReadonlyArray<RedisCommand<any>>>(
  client: RedisClient,
  inputCommands: Commands,
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
    const commands = inputCommands.map((command) => ({
      ...command,
      arguments: command.arguments.map((argument) =>
        typeof argument === "string" ? argument : new Uint8Array(argument)
      ),
      routing: command.routing === undefined ? undefined : {
        ...command.routing,
        keyIndexes: command.routing.keyIndexes?.slice(),
        node: command.routing.node === undefined ? undefined : { ...command.routing.node }
      }
    }))
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
    const replies = yield* connection.pipeline([
      { arguments: ["MULTI"], routing: { keyIndexes: [] } },
      ...commands,
      { arguments: ["EXEC"], routing: { keyIndexes: [] } }
    ])
    const executed = replies[replies.length - 1]
    // A lost EXEC reply can leave the transaction committed even if an earlier
    // acknowledgement also failed. Preserve that uncertain outcome.
    if (executed._tag === "Failure" && executed.failure.reason !== "Server") {
      return yield* Effect.fail(executed.failure)
    }
    for (let index = 0; index < replies.length - 1; index++) {
      const result = replies[index]
      if (result._tag === "Failure") {
        return yield* Effect.fail(
          index === 0 ? new RedisError({ ...result.failure, outcome: "Unknown" }) : result.failure
        )
      }
      const reply = unwrap(result.success)
      if (reply._tag !== "SimpleString" || reply.value !== (index === 0 ? "OK" : "QUEUED")) {
        return yield* Effect.fail(
          new RedisError({
            reason: "Protocol",
            message: "Redis returned an unexpected transaction acknowledgement",
            outcome: "Unknown"
          })
        )
      }
    }
    if (executed._tag === "Failure") return yield* Effect.fail(executed.failure)
    const reply = unwrap(executed.success)
    if (reply._tag === "Null") return null
    if (reply._tag !== "Array" || reply.values.length !== commands.length) {
      return yield* Effect.fail(
        new RedisError({ reason: "Protocol", message: "Redis EXEC returned an unexpected result", outcome: "Unknown" })
      )
    }
    return reply.values.map((value, index) => {
      const unwrapped = unwrap(value)
      return unwrapped._tag === "Error"
        ? Result.fail(new RedisError({ reason: "Server", message: unwrapped.message, code: unwrapped.code }))
        : commands[index].decode(value)
    }) as any
  }))
