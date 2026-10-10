/**
 * @title Handling client errors
 *
 * Every client method fails with one `GraphQLClientError` that names the
 * operation and carries a reason. Retry with `isRetryable` and `retryAfter`,
 * and recover from specific reasons with `Effect.catchReasons`.
 */
import { Duration, Effect, Schedule } from "effect"
import type { GraphQLClientError } from "effect/graphql"
import { GitHub } from "./20_client.ts"

// The five reasons, and when each is retryable:
//
// - `ResponseError`: the server answered with a non-empty `errors` array.
//   Never retryable. `data` is kept raw on the error.
// - `TransportError`: no GraphQL response arrived: a network failure, an HTTP
//   response that isn't a GraphQL response (`status` is set), or a closed
//   WebSocket (`closeCode` is set). Retryable for network failures, `429`,
//   `5xx` and non-fatal close codes. A `Retry-After` header becomes
//   `retryAfter`.
// - `EncodeError`: the variables didn't encode, so nothing was sent.
// - `DecodeError`: the body wasn't a GraphQL response, or `data` didn't match
//   the result Schema.
// - `PaginationError`: `GraphQLClient.pages` or `items` couldn't continue.
//
// `GraphQLClientError.isRetryable` and `.retryAfter` delegate to the reason.

// Exponential backoff that never waits less than the server asked for.
// `setInputType` lets the delay function read the error being retried.
const retryPolicy = Schedule.exponential("250 millis").pipe(
  Schedule.setInputType<GraphQLClientError.GraphQLClientError>(),
  Schedule.modifyDelay(({ duration, input }) =>
    Effect.succeed(input.retryAfter === undefined ? duration : Duration.max(duration, input.retryAfter))
  )
)

export const viewerLogin = Effect.gen(function*() {
  const github = yield* GitHub
  const { viewer } = yield* github.Viewer().pipe(
    // Retry only what can succeed on a second attempt, at most five times.
    Effect.retry({ schedule: retryPolicy, while: (error) => error.isRetryable, times: 5 })
  )
  return viewer.login
}).pipe(
  // The reasons are tagged errors, so the reason helpers work on them.
  Effect.catchReasons("GraphQLClientError", {
    ResponseError: (reason) =>
      // Each GraphQL error has a `message`, an optional `path` to the field it
      // hit and server-specific `extensions`, such as GitHub's `type`.
      Effect.fail(`GitHub rejected the query: ${reason.errors.map((error) => error.message).join("; ")}`),
    TransportError: (reason) =>
      Effect.fail(
        reason.status === 401
          ? "The GITHUB_TOKEN is missing or invalid"
          : `GitHub is unreachable: ${reason.description}`
      )
  })
)
