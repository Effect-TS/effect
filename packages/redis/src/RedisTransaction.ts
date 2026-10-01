/**
 * Redis transactions submitted as one MULTI/EXEC batch on a dedicated session.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import { argumentText, notSent, withOutcome } from "./internal/transport.ts"
import type { Affinity, RedisClient } from "./RedisClient.ts"
import * as Command from "./RedisCommand.ts"
import type { RedisConnection } from "./RedisConnection.ts"
import { RedisError } from "./RedisError.ts"
import type { Reply } from "./RedisProtocol.ts"

const controlCommands = new Set(["MULTI", "EXEC", "DISCARD", "WATCH", "UNWATCH", "RESET", "QUIT"])

const unwrap = (reply: Reply): Reply => {
  while (reply._tag === "Attribute") reply = reply.value
  return reply
}

const uncertain = (message: string) => new RedisError({ reason: "Protocol", message, outcome: "Unknown" })

// Checks the MULTI and QUEUED acknowledgements and returns the EXEC replies.
const execReplies = (
  replies: ReadonlyArray<Result.Result<Reply, RedisError>>,
  count: number
): Result.Result<ReadonlyArray<Reply> | null, RedisError> => {
  const exec = replies[count + 1]
  if (replies.length !== count + 2) return Result.fail(uncertain("Redis returned an unexpected transaction result"))
  // A lost EXEC reply leaves the outcome unknown, whatever was acknowledged before.
  if (exec._tag === "Failure" && exec.failure.reason !== "Server") return Result.fail(exec.failure)
  for (let index = 0; index <= count; index++) {
    const ack = replies[index]
    if (ack._tag === "Failure") {
      // If MULTI was rejected, later commands may have run outside a transaction.
      return Result.fail(index === 0 ? withOutcome(ack.failure, "Unknown") : ack.failure)
    }
    const value = unwrap(ack.success)
    if (value._tag !== "SimpleString" || value.value !== (index === 0 ? "OK" : "QUEUED")) {
      return Result.fail(uncertain("Redis returned an unexpected transaction acknowledgement"))
    }
  }
  if (exec._tag === "Failure") return Result.fail(exec.failure)
  const value = unwrap(exec.success)
  if (value._tag === "Null") return Result.succeed(null)
  if (value._tag !== "Array" || value.values.length !== count) {
    return Result.fail(uncertain("Redis EXEC returned an unexpected result"))
  }
  return Result.succeed(value.values)
}

// In Cluster, pin the session to the slot of the first keyed command.
const clusterAffinity = (
  client: RedisClient,
  commands: ReadonlyArray<Command.RedisCommand<any>>
): Affinity | undefined => {
  if (client.config.topology?._tag !== "Cluster") return undefined
  for (const command of commands) {
    const index = (command.routing ?? Command.inferRouting(command.arguments))?.keyIndexes?.[0]
    if (index !== undefined) return { key: command.arguments[index] }
  }
}

/**
 * Executes commands atomically without automatic retry.
 *
 * **Details**
 *
 * MULTI, the commands, and EXEC are written together on a dedicated session,
 * after `watch` (if any) has run on that session. Command errors are returned
 * in their result positions, and `null` indicates a WATCH conflict. In Cluster,
 * every command must use the slot of the affinity key, which defaults to the
 * first keyed command.
 *
 * **Gotchas**
 *
 * A lost EXEC reply leaves the outcome unknown; the transaction is never
 * replayed. Transaction control commands are rejected before connecting.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const execute = <Commands extends ReadonlyArray<Command.RedisCommand<any>>>(
  client: RedisClient,
  commands: Commands,
  options?: {
    readonly affinity?: Affinity
    readonly watch?: (connection: RedisConnection) => Effect.Effect<void, RedisError>
  }
): Effect.Effect<
  {
    readonly [K in keyof Commands]: Result.Result<
      Commands[K] extends Command.RedisCommand<infer A> ? A : never,
      RedisError
    >
  } | null,
  RedisError
> =>
  Effect.gen(function*() {
    if (commands.some((command) => controlCommands.has(argumentText(command.arguments[0]).toUpperCase()))) {
      return yield* Effect.fail(notSent("Routing", "Transactions cannot contain transaction control commands"))
    }
    const connection = yield* client.reserve(options?.affinity ?? clusterAffinity(client, commands))
    if (options?.watch !== undefined) yield* options.watch(connection)
    const replies = yield* connection.pipeline([
      { arguments: ["MULTI"], routing: { keyIndexes: [] } },
      ...commands,
      { arguments: ["EXEC"], routing: { keyIndexes: [] } }
    ])
    const results = yield* Effect.fromResult(execReplies(replies, commands.length))
    if (results === null) return null
    return results.map((reply, index) => {
      const value = unwrap(reply)
      return value._tag === "Error"
        ? Result.fail(new RedisError({ reason: "Server", message: value.message, code: value.code }))
        : commands[index].decode(reply)
    }) as any
  }).pipe(Effect.scoped)
