/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import type * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as internal from "@effect/platform/internal/http/clientResponse"

export {
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyJson,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyUrlParams,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaHeaders
} from "@effect/platform/Http/IncomingMessage"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ClientResponse extends IncomingMessage.IncomingMessage<Error.ResponseError> {
  readonly [TypeId]: TypeId
  readonly status: number
  readonly formData: Effect.Effect<never, Error.ResponseError, FormData>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWeb: (request: ClientRequest.ClientRequest, source: Response) => ClientResponse = internal.fromWeb
