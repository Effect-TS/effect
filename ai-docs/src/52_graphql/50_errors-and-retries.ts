/**
 * @title Handling GraphQL errors, retries and rate limits
 *
 * Read rate-limit headers in a middleware, tell GraphQL errors apart by their
 * fields, and retry timeouts and rate limits with `Effect.retry`.
 */
import { Duration, Effect, Layer, Schedule } from "effect"
import { type GraphQLClientError, GraphQLMiddleware } from "effect/graphql"
import { GitHub } from "./10_basics.ts"

// Middleware see each response's HTTP `status` and `headers` on the result
// `next` returns, including responses with GraphQL `errors`. A failed call
// keeps them on `ResponseError` or `TransportError`. Attach it with
// `GraphQLGroup.make(...).middleware(RateLimit)`.
export class RateLimit extends GraphQLMiddleware.Service<RateLimit>()("app/RateLimit") {
  static readonly layer = Layer.succeed(RateLimit, {
    execute: ({ next, request }) =>
      Effect.tap(next(request), (result) => {
        const remaining = Number(result.headers?.["x-ratelimit-remaining"])
        return remaining < 500
          ? Effect.logWarning(`GitHub rate limit: ${remaining} points left`)
          : Effect.void
      }),
    subscribe: ({ next, request }) => next(request)
  })
}

// GraphQL errors keep fields the specification doesn't define as JSON, such
// as GitHub's top-level `type` (`NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`).
export const hasErrorType = (error: GraphQLClientError.GraphQLClientError, type: string) =>
  error.reason._tag === "ResponseError" && error.reason.errors.every((entry) => entry.type === type)

// How long GitHub asked us to wait: `retry-after`, or until
// `x-ratelimit-reset` once `x-ratelimit-remaining` is `0`. GitHub's secondary
// rate limits answer 403 with a body that isn't a GraphQL response, so they
// are a `TransportError` whose `isRetryable` is false; the headers still say
// when to retry.
const rateLimitWait = (error: GraphQLClientError.GraphQLClientError, now: number) => {
  if (error.retryAfter !== undefined) return error.retryAfter
  const reason = error.reason
  const headers = reason._tag === "ResponseError" || reason._tag === "TransportError" ? reason.headers : undefined
  if (headers?.["x-ratelimit-remaining"] !== "0") return undefined
  const reset = Number(headers["x-ratelimit-reset"]) * 1000
  return Number.isFinite(reset) ? Duration.millis(Math.max(0, reset - now)) : Duration.minutes(1)
}

const gitHubRetry = Schedule.exponential("1 second").pipe(
  Schedule.setInputType<GraphQLClientError.GraphQLClientError>(),
  Schedule.modifyDelay(({ duration, input, now }) => Effect.succeed(rateLimitWait(input, now) ?? duration))
)

// `isRetryable` is true for network failures and for 429 or 5xx responses,
// which covers GitHub's 502 and 504 query timeouts even when they come with a
// GraphQL `errors` body. The client never retries on its own. Retry only
// mutations that are safe to send twice, and with `GraphQLClient.pages`,
// retry inside a middleware, because `Stream.retry` starts again from the
// first page.
export const retryGitHub = <A, R>(effect: Effect.Effect<A, GraphQLClientError.GraphQLClientError, R>) =>
  Effect.retry(effect, {
    schedule: gitHubRetry,
    while: (error) => error.isRetryable || rateLimitWait(error, Date.now()) !== undefined,
    times: 5
  })

export const program = Effect.gen(function*() {
  const github = yield* GitHub
  const result = yield* retryGitHub(github.RepoIssues({ owner: "Effect-TS", name: "missing" })).pipe(
    Effect.catchIf((error) => hasErrorType(error, "NOT_FOUND"), () => Effect.succeed(null))
  )
  yield* Effect.log(result === null ? "No such repository" : `${result.repository?.issues.nodes?.length} issues`)
}).pipe(Effect.provide(GitHub.layer))
