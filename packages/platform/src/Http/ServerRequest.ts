/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/serverRequest.js"
import type * as Path from "../Path.js"
import type * as FormData from "./FormData.js"
import type * as Headers from "./Headers.js"
import type * as IncomingMessage from "./IncomingMessage.js"
import type { Method } from "./Method.js"
import type * as Error from "./ServerError.js"

export {
  /**
   * @since 1.0.0
   * @category fiber refs
   */
  maxBodySize
} from "./IncomingMessage.js"

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
export interface ServerRequest extends IncomingMessage.IncomingMessage<Error.RequestError> {
  readonly [TypeId]: TypeId
  readonly url: string
  readonly originalUrl: string
  readonly method: Method

  readonly formData: Effect.Effect<
    Scope.Scope | FileSystem.FileSystem | Path.Path,
    FormData.FormDataError,
    FormData.PersistedFormData
  >
  readonly formDataStream: Stream.Stream<never, FormData.FormDataError, FormData.Part>

  readonly modify: (
    options: {
      readonly url?: string
      readonly headers?: Headers.Headers
      readonly remoteAddress?: string
    }
  ) => ServerRequest
}

/**
 * @since 1.0.0
 * @category context
 */
export const ServerRequest: Context.Tag<ServerRequest, ServerRequest> = internal.serverRequestTag

/**
 * @since 1.0.0
 * @category accessors
 */
export const persistedFormData: Effect.Effect<
  Scope.Scope | FileSystem.FileSystem | Path.Path | ServerRequest,
  FormData.FormDataError,
  unknown
> = internal.persistedFormData

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders: <I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<ServerRequest, ParseResult.ParseError, A> = internal.schemaHeaders

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson: <I, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<ServerRequest, Error.RequestError | ParseResult.ParseError, A> = internal.schemaBodyJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams: <I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<ServerRequest, Error.RequestError | ParseResult.ParseError, A> = internal.schemaBodyUrlParams

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFormData: <I extends FormData.PersistedFormData, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<
  ServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path,
  FormData.FormDataError | ParseResult.ParseError,
  A
> = internal.schemaFormData

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFormDataJson: <I, A>(
  schema: Schema.Schema<I, A>
) => (
  field: string
) => Effect.Effect<
  ServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path,
  Error.RequestError | FormData.FormDataError | ParseResult.ParseError,
  A
> = internal.schemaFormDataJson

/**
 * @since 1.0.0
 * @category conversions
 */
export const fromWeb: (request: Request) => ServerRequest = internal.fromWeb
