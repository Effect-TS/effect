import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import type { ReadonlyRecord } from "effect/Record"
import * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Cookies from "../Cookies.js"
import type * as FileSystem from "../FileSystem.js"
import * as Headers from "../Headers.js"
import * as IncomingMessage from "../HttpIncomingMessage.js"
import type { HttpMethod } from "../HttpMethod.js"
import * as Error from "../HttpServerError.js"
import type * as ServerRequest from "../HttpServerRequest.js"
import * as Multipart from "../Multipart.js"
import type * as Path from "../Path.js"
import * as Socket from "../Socket.js"
import * as UrlParams from "../UrlParams.js"

/** @internal */
export const TypeId: ServerRequest.TypeId = Symbol.for("@effect/platform/HttpServerRequest") as ServerRequest.TypeId

/** @internal */
export const serverRequestTag = Context.GenericTag<ServerRequest.HttpServerRequest>(
  "@effect/platform/HttpServerRequest"
)

/** @internal */
export const parsedSearchParamsTag = Context.GenericTag<
  ServerRequest.ParsedSearchParams,
  ReadonlyRecord<string, string | Array<string>>
>("@effect/platform/HttpServerRequest/ParsedSearchParams")

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
export const schemaCookies = <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(serverRequestTag, (req) => parse(req.cookies))
}

/** @internal */
export const schemaHeaders = <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = IncomingMessage.schemaHeaders(schema, options)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaSearchParams = <
  A,
  I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>,
  R
>(
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

const isMultipart = (request: ServerRequest.HttpServerRequest) =>
  request.headers["content-type"]?.toLowerCase().includes("multipart/form-data")

/** @internal */
export const schemaBodyForm = <A, I extends Partial<Multipart.Persisted>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parseMultipart = Multipart.schemaPersisted(schema, options)
  const parseUrlParams = IncomingMessage.schemaBodyUrlParams(schema as Schema.Schema<A, any, R>, options)
  return Effect.flatMap(serverRequestTag, (request): Effect.Effect<
    A,
    Multipart.MultipartError | ParseResult.ParseError | Error.RequestError,
    R | ServerRequest.HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
  > => {
    if (isMultipart(request)) {
      return Effect.flatMap(request.multipart, parseMultipart)
    }
    return parseUrlParams(request)
  })
}

/** @internal */
export const schemaBodyUrlParams = <
  A,
  I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>,
  R
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema, options)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyMultipart = <A, I extends Partial<Multipart.Persisted>, R>(
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
        R | FileSystem.FileSystem | Path.Path | Scope.Scope | ServerRequest.HttpServerRequest
      > => {
        if (isMultipart(request)) {
          return Effect.flatMap(
            Effect.mapError(request.multipart, (cause) =>
              new Error.RequestError({
                request,
                reason: "Decode",
                cause
              })),
            parseMultipart(field)
          )
        }
        return Effect.flatMap(request.urlParamsBody, parseUrlParams(field))
      }
    )
}

/** @internal */
export const fromWeb = (request: globalThis.Request): ServerRequest.HttpServerRequest =>
  new ServerRequestImpl(request, removeHost(request.url))

const removeHost = (url: string) => {
  if (url[0] === "/") {
    return url
  }
  const index = url.indexOf("/", url.indexOf("//") + 2)
  return index === -1 ? "/" : url.slice(index)
}

class ServerRequestImpl extends Inspectable.Class implements ServerRequest.HttpServerRequest {
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
      _id: "@effect/platform/HttpServerRequest",
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
  get method(): HttpMethod {
    return this.source.method.toUpperCase() as HttpMethod
  }
  get originalUrl() {
    return this.source.url
  }
  get remoteAddress(): Option.Option<string> {
    return this.remoteAddressOverride ? Option.some(this.remoteAddressOverride) : Option.none()
  }
  get headers(): Headers.Headers {
    this.headersOverride ??= Headers.fromInput(this.source.headers as any)
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
      ? Stream.fromReadableStream(() => this.source.body as any, (cause) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          cause
        }))
      : Stream.fail(
        new Error.RequestError({
          request: this,
          reason: "Decode",
          description: "can not create stream from empty body"
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
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
          })
      })
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<unknown, Error.RequestError> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (cause) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          cause
        })
    })
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.RequestError> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
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
      Stream.mapError(this.stream, (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })),
      Multipart.makeChannel(this.headers)
    )
  }

  private arrayBufferEffect: Effect.Effect<ArrayBuffer, Error.RequestError> | undefined
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.RequestError> {
    if (this.arrayBufferEffect) {
      return this.arrayBufferEffect
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.arrayBuffer(),
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
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
        description: "Not an upgradeable ServerRequest"
      })
    )
  }
}

/** @internal */
export const toURL = (self: ServerRequest.HttpServerRequest): Option.Option<URL> => {
  const host = self.headers.host ?? "localhost"
  const protocol = self.headers["x-forwarded-proto"] === "https" ? "https" : "http"
  try {
    return Option.some(new URL(self.url, `${protocol}://${host}`))
  } catch {
    return Option.none()
  }
}
