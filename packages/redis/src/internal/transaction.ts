import type * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import type { Affinity, RedisClient } from "../RedisClient.ts"
import type { RedisCommand } from "../RedisCommand.ts"
import { RedisError } from "../RedisError.ts"
import type { Reply } from "../RedisProtocol.ts"

type Submit = (
  commands: ReadonlyArray<RedisCommand<any>>,
  affinity: Affinity | undefined
) => Effect.Effect<ReadonlyArray<Reply> | null, RedisError> | undefined

// Concrete clients can reuse exclusively leased transaction sessions. Keep this
// optimization private so arbitrary RedisClient services and dedicated
// reservations retain the same public contract.
const submissions = new WeakMap<RedisClient, Submit>()

export const register = (client: RedisClient, submit: Submit): void => {
  submissions.set(client, submit)
}

export const submit = (
  client: RedisClient,
  commands: ReadonlyArray<RedisCommand<any>>,
  affinity: Affinity | undefined
): ReturnType<Submit> => submissions.get(client)?.(commands, affinity)

export const validate = (
  replies: ReadonlyArray<Result.Result<Reply, RedisError>>,
  count: number
): Result.Result<ReadonlyArray<Reply> | null, RedisError> => {
  if (replies.length !== count + 2) {
    return Result.fail(
      new RedisError({
        reason: "Protocol",
        message: "Redis returned an unexpected transaction result",
        outcome: "Unknown"
      })
    )
  }
  const executed = replies[replies.length - 1]
  // Losing EXEC leaves the outcome uncertain even if an earlier acknowledgement
  // failed. Validate before returning a leased session to its idle pool.
  if (executed._tag === "Failure" && executed.failure.reason !== "Server") return Result.fail(executed.failure)
  for (let index = 0; index < replies.length - 1; index++) {
    const result = replies[index]
    if (result._tag === "Failure") {
      return Result.fail(index === 0 ? new RedisError({ ...result.failure, outcome: "Unknown" }) : result.failure)
    }
    let reply = result.success
    while (reply._tag === "Attribute") reply = reply.value
    if (reply._tag !== "SimpleString" || reply.value !== (index === 0 ? "OK" : "QUEUED")) {
      return Result.fail(
        new RedisError({
          reason: "Protocol",
          message: "Redis returned an unexpected transaction acknowledgement",
          outcome: "Unknown"
        })
      )
    }
  }
  if (executed._tag === "Failure") return Result.fail(executed.failure)
  let reply = executed.success
  while (reply._tag === "Attribute") reply = reply.value
  if (reply._tag === "Null") return Result.succeed(null)
  if (reply._tag !== "Array" || reply.values.length !== count) {
    return Result.fail(
      new RedisError({ reason: "Protocol", message: "Redis EXEC returned an unexpected result", outcome: "Unknown" })
    )
  }
  return Result.succeed(reply.values)
}
