/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { Option } from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as FileSystem from "./FileSystem.js"
import type * as Headers from "./Headers.js"
import type * as IncomingMessage from "./HttpIncomingMessage.js"
import type { HttpMethod } from "./HttpMethod.js"
import type * as Error from "./HttpServerError.js"
import * as internal from "./internal/httpServerRequest.js"
import type * as Multipart from "./Multipart.js"
import type * as Path from "./Path.js"
import type * as Socket from "./Socket.js"

export {
  /**
   * @since 1.0.0
   * @category fiber refs
   */
  maxBodySize
} from "./HttpIncomingMessage.js"

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
export interface HttpServerRequest extends IncomingMessage.HttpIncomingMessage<Error.RequestError> {
  readonly [TypeId]: TypeId
  readonly source: unknown
  readonly url: string
  readonly originalUrl: string
  readonly method: HttpMethod
  readonly cookies: ReadonlyRecord<string, string>

  readonly multipart: Effect.Effect<
    Multipart.Persisted,
    Multipart.MultipartError,
    Scope.Scope | FileSystem.FileSystem | Path.Path
  >
  readonly multipartStream: Stream.Stream<Multipart.Part, Multipart.MultipartError>

  readonly upgrade: Effect.Effect<Socket.Socket, Error.RequestError>

  readonly modify: (
    options: {
      readonly url?: string
      readonly headers?: Headers.Headers
      readonly remoteAddress?: string
    }
  ) => HttpServerRequest
}

/**
 * @since 1.0.0
 * @category context
 */
export const HttpServerRequest: Context.Tag<HttpServerRequest, HttpServerRequest> = internal.serverRequestTag

/**
 * @since 1.0.0
 * @category search params
 */
export interface ParsedSearchParams {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category search params
 */
export const ParsedSearchParams: Context.Tag<ParsedSearchParams, ReadonlyRecord<string, string | Array<string>>> =
  internal.parsedSearchParamsTag

/**
 * @since 1.0.0
 * @category search params
 */
export const searchParamsFromURL: (url: URL) => ReadonlyRecord<string, string | Array<string>> =
  internal.searchParamsFromURL

/**
 * @since 1.0.0
 * @category accessors
 */
export const persistedMultipart: Effect.Effect<
  unknown,
  Multipart.MultipartError,
  Scope.Scope | FileSystem.FileSystem | Path.Path | HttpServerRequest
> = internal.multipartPersisted

/**
 * @since 1.0.0
 * @category accessors
 */
export const upgrade: Effect.Effect<Socket.Socket, Error.RequestError, HttpServerRequest> = internal.upgrade

/**
 * @since 1.0.0
 * @category accessors
 */
export const upgradeChannel: <IE = never>() => Channel<
  Chunk<Uint8Array>,
  Chunk<Uint8Array | string | Socket.CloseEvent>,
  Error.RequestError | IE | Socket.SocketError,
  IE,
  void,
  unknown,
  HttpServerRequest
> = internal.upgradeChannel

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaCookies: <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, HttpServerRequest | R> = internal.schemaCookies

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders: <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, HttpServerRequest | R> = internal.schemaHeaders

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaSearchParams: <A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, ParsedSearchParams | R> = internal.schemaSearchParams

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, Error.RequestError | ParseResult.ParseError, HttpServerRequest | R> = internal.schemaBodyJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyForm: <A, I extends Partial<Multipart.Persisted>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  Multipart.MultipartError | ParseResult.ParseError | Error.RequestError,
  R | HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
> = internal.schemaBodyForm

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams: <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError | Error.RequestError, R | HttpServerRequest> = internal.schemaBodyUrlParams

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyMultipart: <A, I extends Partial<Multipart.Persisted>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  Multipart.MultipartError | ParseResult.ParseError,
  R | HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
> = internal.schemaBodyMultipart

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyFormJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => (
  field: string
) => Effect.Effect<
  A,
  ParseResult.ParseError | Error.RequestError,
  R | HttpServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope
> = internal.schemaBodyFormJson

/**
 * @since 1.0.0
 * @category conversions
 */
export const fromWeb: (request: Request) => HttpServerRequest = internal.fromWeb

/**
 * @since 1.0.0
 * @category conversions
 */
export const toURL: (self: HttpServerRequest) => Option<URL> = internal.toURL
