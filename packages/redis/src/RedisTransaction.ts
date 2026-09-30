/**
 * Redis transactions with atomic batch submission and isolated WATCH sessions.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as TransactionInternal from "./internal/transaction.ts"
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
 * Executes commands atomically without automatic retry.
 *
 * **Details**
 *
 * Individual EXEC errors are returned in their result positions. A null result
 * indicates a WATCH conflict. `watch` runs before MULTI on the same session.
 * MULTI, the queued commands, and EXEC are submitted together without waiting
 * for intermediate replies. Watchless transactions containing ordinary commands
 * reuse an exclusively leased transaction session; WATCH and connection-local
 * state use fresh dedicated sessions. Concurrent transactions acquire separate
 * sessions, and ordinary client commands use their own connections.
 * In Cluster, supply a key affinity and use keys in that slot.
 *
 * **Gotchas**
 *
 * Losing the EXEC reply leaves the transaction outcome uncertain. This helper
 * never replays the transaction. Cross-slot transactions are unsupported.
 * Interruption closes the transaction session and does not affect ordinary
 * client commands.
 * Transaction and session reset commands are rejected before opening a session.
 * The server must permit MULTI. If it rejects MULTI, subsequent commands may
 * execute outside a transaction and the failure has an unknown outcome.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const execute = Effect.fnUntraced(function*<Commands extends ReadonlyArray<RedisCommand<any>>>(
  client: RedisClient,
  inputCommands: Commands,
  options?: {
    readonly affinity?: Affinity
    readonly watch?: (connection: RedisConnection) => Effect.Effect<void, RedisError>
  }
): Effect.fn.Return<
  {
    readonly [K in keyof Commands]: Result.Result<Commands[K] extends RedisCommand<infer A> ? A : never, RedisError>
  } | null,
  RedisError
> {
  const commands = new Array<RedisCommand<any>>(inputCommands.length)
  for (let index = 0; index < inputCommands.length; index++) {
    const command = inputCommands[index]
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
    commands[index] = {
      arguments: command.arguments.map((argument) =>
        typeof argument === "string" ? argument : new Uint8Array(argument)
      ),
      decode: command.decode,
      routing: command.routing === undefined ? undefined : {
        keyIndexes: command.routing.keyIndexes?.slice(),
        node: command.routing.node === undefined ? undefined : { ...command.routing.node }
      }
    }
  }
  const submitted = options?.watch === undefined
    ? TransactionInternal.submit(client, commands, options?.affinity)
    : undefined
  const replies = yield* submitted ?? Effect.scoped(Effect.gen(function*() {
    const connection = yield* client.reserve(options?.affinity)
    if (options?.watch !== undefined) yield* options.watch(connection)
    return yield* connection.pipeline([
      { arguments: ["MULTI"], routing: { keyIndexes: [] } },
      ...commands,
      { arguments: ["EXEC"], routing: { keyIndexes: [] } }
    ]).pipe(Effect.flatMap((replies) => Effect.fromResult(TransactionInternal.validate(replies, commands.length))))
  }))
  if (replies === null) return null
  return replies.map((value, index) => {
    const unwrapped = unwrap(value)
    return unwrapped._tag === "Error"
      ? Result.fail(new RedisError({ reason: "Server", message: unwrapped.message, code: unwrapped.code }))
      : commands[index].decode(value)
  }) as any
})
