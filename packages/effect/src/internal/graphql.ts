import type { NonEmptyReadonlyArray } from "../Array.ts"
import { type GraphQLError, ResponseError } from "../graphql/GraphQLClientError.ts"
import type { ExecutionResult } from "../graphql/GraphQLProtocol.ts"
import type * as Schema from "../Schema.ts"

/**
 * The `ResponseError` a strict call fails with: the errors plus the raw
 * `data`, `extensions` and `status` of the response.
 *
 * @internal
 */
export const responseError = (
  result: ExecutionResult | undefined,
  errors: NonEmptyReadonlyArray<GraphQLError>
): ResponseError =>
  new ResponseError({
    errors,
    // `data` is whatever the protocol returned; the HTTP transport parses it
    // from JSON, which is what `ResponseError` declares.
    ...(result?.data === undefined ? {} : { data: result.data as Schema.Json }),
    ...(result?.extensions === undefined ? {} : { extensions: result.extensions }),
    ...(result?.status === undefined ? {} : { status: result.status })
  })

/**
 * The response each `{ partial: true }` result was decoded from, so that
 * `GraphQLResolver` can fail with the same `ResponseError` as a strict call.
 * Results from `GraphQLClient.makeTest` have no entry.
 *
 * @internal
 */
export const partialResponses = new WeakMap<object, ExecutionResult>()
