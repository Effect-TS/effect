import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as FileSystem from "../../FileSystem.js"
import * as Cookies from "../../Http/Cookies.js"
import * as Headers from "../../Http/Headers.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import type { Method } from "../../Http/Method.js"
import * as Multipart from "../../Http/Multipart.js"
import * as Error from "../../Http/ServerError.js"
import type * as ServerRequest from "../../Http/ServerRequest.js"
import * as UrlParams from "../../Http/UrlParams.js"
import type * as Path from "../../Path.js"
import * as Socket from "../../Socket.js"

/** @internal */
export const TypeId: ServerRequest.TypeId = Symbol.for("@effect/platform/Http/ServerRequest") as ServerRequest.TypeId

/** @internal */
export const serverRequestTag = Context.GenericTag<ServerRequest.ServerRequest>("@effect/platform/Http/ServerRequest")

/** @internal */
export const parsedSearchParamsTag = Context.GenericTag<
  ServerRequest.ParsedSearchParams,
  ReadonlyRecord<string, string | Array<string>>
>("@effect/platform/Http/ServerRequest/ParsedSearchParams")

/** @internal */
export const upgrade = Effect.flatMap(serverRequestTag, (request) => request.upgrade)

/** @internal */
export const upgradeChannel = <IE = never>() => Channel.unwrap(Effect.map(upgrade, Socket.toChannelWith<IE>()))

/** @internal */
export const multipartPersisted = Effect.flatMap(serverRequestTag, (request) => request.multipart)

/** @internal */
export const searchParamsFromURL = (url: URL): ReadonlyRecord<string, string | Array<string>> => {
  const out: Record<string, string | Array<string>> = {}
  for (const [key, value] of url.searchParams.entries()) {
    const entry = out[key]
    if (entry !== undefined) {
      if (Array.isArray(entry)) {
        entry.push(value)
      } else {
        out[key] = [entry, value]
      }
    } else {
      out[key] = value
    }
  }
  return out
}

/** @internal */
export const schemaCookies = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(serverRequestTag, (req) => parse(req.cookies))
}

/** @internal */
export const schemaHeaders = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = IncomingMessage.schemaHeaders(schema, options)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaSearchParams = <R, I extends Readonly<Record<string, string | Array<string> | undefined>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(parsedSearchParamsTag, parse)
}

/** @internal */
export const schemaBodyJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const parse = IncomingMessage.schemaBodyJson(schema, options)
  return Effect.flatMap(serverRequestTag, parse)
}

const isMultipart = (request: ServerRequest.ServerRequest) =>
  request.headers["content-type"]?.toLowerCase().includes("multipart/form-data")

/** @internal */
export const schemaBodyForm = <R, I extends Partial<Multipart.Persisted>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parseMultipart = Multipart.schemaPersisted(schema, options)
  const parseUrlParams = IncomingMessage.schemaBodyUrlParams(schema as Schema.Schema<A, any, R>, options)
  return Effect.flatMap(serverRequestTag, (request): Effect.Effect<
    A,
    Multipart.MultipartError | ParseResult.ParseError | Error.RequestError,
    R | ServerRequest.ServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
  > => {
    if (isMultipart(request)) {
      return Effect.flatMap(request.multipart, parseMultipart)
    }
    return parseUrlParams(request)
  })
}

/** @internal */
export const schemaBodyUrlParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema, options)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyMultipart = <R, I extends Partial<Multipart.Persisted>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Multipart.schemaPersisted(schema, options)
  return Effect.flatMap(multipartPersisted, parse)
}

/** @internal */
export const schemaBodyFormJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const parseMultipart = Multipart.schemaJson(schema, options)
  const parseUrlParams = UrlParams.schemaJson(schema, options)
  return (field: string) =>
    Effect.flatMap(
      serverRequestTag,
      (
        request
      ): Effect.Effect<
        A,
        ParseResult.ParseError | Error.RequestError,
        R | FileSystem.FileSystem | Path.Path | Scope.Scope | ServerRequest.ServerRequest
      > => {
        if (isMultipart(request)) {
          return Effect.flatMap(
            Effect.mapError(request.multipart, (error) =>
              new Error.RequestError({
                request,
                reason: "Decode",
                error
              })),
            parseMultipart(field)
          )
        }
        return Effect.flatMap(request.urlParamsBody, parseUrlParams(field))
      }
    )
}

/** @internal */
export const fromWeb = (request: globalThis.Request): ServerRequest.ServerRequest =>
  new ServerRequestImpl(request, request.url)

class ServerRequestImpl extends Inspectable.Class implements ServerRequest.ServerRequest {
  readonly [TypeId]: ServerRequest.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  constructor(
    readonly source: Request,
    readonly url: string,
    public headersOverride?: Headers.Headers,
    private remoteAddressOverride?: string
  ) {
    super()
    this[TypeId] = TypeId
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }
  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/Http/ServerRequest",
      method: this.method,
      url: this.originalUrl
    })
  }
  modify(
    options: {
      readonly url?: string | undefined
      readonly headers?: Headers.Headers | undefined
      readonly remoteAddress?: string | undefined
    }
  ) {
    return new ServerRequestImpl(
      this.source,
      options.url ?? this.url,
      options.headers ?? this.headersOverride,
      options.remoteAddress ?? this.remoteAddressOverride
    )
  }
  get method(): Method {
    return this.source.method.toUpperCase() as Method
  }
  get originalUrl() {
    return this.source.url
  }
  get remoteAddress(): Option.Option<string> {
    return this.remoteAddressOverride ? Option.some(this.remoteAddressOverride) : Option.none()
  }
  get headers(): Headers.Headers {
    this.headersOverride ??= Headers.fromInput(this.source.headers)
    return this.headersOverride
  }

  private cachedCookies: ReadonlyRecord<string, string> | undefined
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies
    }
    return this.cachedCookies = Cookies.parseHeader(this.headers.cookie ?? "")
  }

  get stream(): Stream.Stream<Uint8Array, Error.RequestError> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body as any, (_) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error: _
        }))
      : Stream.fail(
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error: "can not create stream from empty body"
        })
      )
  }

  private textEffect: Effect.Effect<string, Error.RequestError> | undefined
  get text(): Effect.Effect<string, Error.RequestError> {
    if (this.textEffect) {
      return this.textEffect
    }
    this.textEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.text(),
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      })
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<unknown, Error.RequestError> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (error) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error
        })
    })
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.RequestError> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      }))
  }

  private multipartEffect:
    | Effect.Effect<
      Multipart.Persisted,
      Multipart.MultipartError,
      Scope.Scope | FileSystem.FileSystem | Path.Path
    >
    | undefined
  get multipart(): Effect.Effect<
    Multipart.Persisted,
    Multipart.MultipartError,
    Scope.Scope | FileSystem.FileSystem | Path.Path
  > {
    if (this.multipartEffect) {
      return this.multipartEffect
    }
    this.multipartEffect = Effect.runSync(Effect.cached(
      Multipart.toPersisted(this.multipartStream)
    ))
    return this.multipartEffect
  }

  get multipartStream(): Stream.Stream<Multipart.Part, Multipart.MultipartError> {
    return Stream.pipeThroughChannel(
      Stream.mapError(this.stream, (error) => new Multipart.MultipartError({ reason: "InternalError", error })),
      Multipart.makeChannel(this.headers)
    )
  }

  private arrayBufferEffect: Effect.Effect<ArrayBuffer, Error.RequestError> | undefined
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.RequestError> {
    if (this.arrayBuffer) {
      return this.arrayBuffer
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.arrayBuffer(),
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      })
    ))
    return this.arrayBufferEffect
  }

  get upgrade(): Effect.Effect<Socket.Socket, Error.RequestError> {
    return Effect.fail(
      new Error.RequestError({
        request: this,
        reason: "Decode",
        error: "Not an upgradeable ServerRequest"
      })
    )
  }
}
