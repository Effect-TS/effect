/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Effect from "@effect/io/Effect"
import type * as Scope from "@effect/io/Scope"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as FormData from "@effect/platform/Http/FormData"
import type * as Headers from "@effect/platform/Http/Headers"
import type * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import type { Method } from "@effect/platform/Http/Method"
import type * as Error from "@effect/platform/Http/ServerError"
import * as internal from "@effect/platform/internal/http/serverRequest"
import type * as Path from "@effect/platform/Path"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Stream from "@effect/stream/Stream"

export {
  /**
   * @since 1.0.0
   * @category fiber refs
   */
  maxBodySize
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
export interface ServerRequest extends IncomingMessage.IncomingMessage<Error.RequestError> {
  readonly [TypeId]: TypeId
  readonly url: string
  readonly originalUrl: string
  readonly method: Method

  readonly formData: Effect.Effect<Scope.Scope | FileSystem.FileSystem | Path.Path, FormData.FormDataError, FormData>
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
export const formDataRecord: Effect.Effect<
  Scope.Scope | FileSystem.FileSystem | Path.Path | ServerRequest,
  FormData.FormDataError,
  Record<string, string | Array<File>>
> = internal.formDataRecord

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
export const schemaFormData: <I extends Readonly<Record<string, string | ReadonlyArray<File>>>, A>(
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
