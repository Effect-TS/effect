import type { NonEmptyReadonlyArray } from "../Array.ts"
import { type GraphQLError, ResponseError } from "../graphql/GraphQLClientError.ts"
import type { ExecutionResult } from "../graphql/GraphQLProtocol.ts"
import type * as Schema from "../Schema.ts"

/**
 * Builds a response error with raw data and transport metadata.
 *
 * @internal
 */
export const responseError = (
  result: ExecutionResult | undefined,
  errors: NonEmptyReadonlyArray<GraphQLError>
): ResponseError =>
  new ResponseError({
    errors,
    ...(result?.data === undefined ? {} : { data: result.data as Schema.Json }),
    ...(result?.extensions === undefined ? {} : { extensions: result.extensions }),
    ...(result?.status === undefined ? {} : { status: result.status })
  })

/**
 * Raw responses for partial results, used by resolvers to preserve error
 * metadata. Mock client results have no entry.
 *
 * @internal
 */
export const partialResponses = new WeakMap<object, ExecutionResult>()
