import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import type * as Error from "../../Http/ClientError.js"
import type * as ClientRequest from "../../Http/ClientRequest.js"
import type * as ClientResponse from "../../Http/ClientResponse.js"
import * as Headers from "../../Http/Headers.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import * as UrlParams from "../../Http/UrlParams.js"
import * as internalError from "./clientError.js"

/** @internal */
export const TypeId: ClientResponse.TypeId = Symbol.for("@effect/platform/Http/ClientResponse") as ClientResponse.TypeId

/** @internal */
export const fromWeb = (
  request: ClientRequest.ClientRequest,
  source: globalThis.Response
): ClientResponse.ClientResponse => new ClientResponseImpl(request, source)

class ClientResponseImpl implements ClientResponse.ClientResponse {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  readonly [TypeId]: ClientResponse.TypeId

  constructor(
    private readonly request: ClientRequest.ClientRequest,
    private readonly source: globalThis.Response
  ) {
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
    this[TypeId] = TypeId
  }

  get status(): number {
    return this.source.status
  }

  get headers(): Headers.Headers {
    return Headers.fromInput(this.source.headers)
  }

  get remoteAddress(): Option.Option<string> {
    return Option.none()
  }

  get stream(): Stream.Stream<never, Error.ResponseError, Uint8Array> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body!, (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        }))
      : Stream.fail(internalError.responseError({
        request: this.request,
        response: this,
        reason: "EmptyBody",
        error: "can not create stream from empty body"
      }))
  }

  get json(): Effect.Effect<never, Error.ResponseError, unknown> {
    return Effect.tryMap(this.text, {
      try: (text) => text === "" ? null : JSON.parse(text) as unknown,
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  private textBody?: Effect.Effect<never, Error.ResponseError, string>
  get text(): Effect.Effect<never, Error.ResponseError, string> {
    return this.textBody ??= Effect.tryPromise({
      try: () => this.source.text(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    }).pipe(Effect.cached, Effect.runSync)
  }

  get urlParamsBody(): Effect.Effect<never, Error.ResponseError, UrlParams.UrlParams> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (_) =>
          internalError.responseError({
            request: this.request,
            response: this,
            reason: "Decode",
            error: _
          })
      }))
  }

  private formDataBody?: Effect.Effect<never, Error.ResponseError, FormData>
  get formData(): Effect.Effect<never, Error.ResponseError, FormData> {
    return this.formDataBody ??= Effect.tryPromise({
      try: () => this.source.formData(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    }).pipe(Effect.cached, Effect.runSync)
  }

  private arrayBufferBody?: Effect.Effect<never, Error.ResponseError, ArrayBuffer>
  get arrayBuffer(): Effect.Effect<never, Error.ResponseError, ArrayBuffer> {
    return this.arrayBufferBody ??= Effect.tryPromise({
      try: () => this.source.arrayBuffer(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    }).pipe(Effect.cached, Effect.runSync)
  }
}

/** @internal */
export const schemaJson = <
  I extends {
    readonly status?: number
    readonly headers?: Headers.Headers
    readonly body?: unknown
  },
  A
>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return (self: ClientResponse.ClientResponse): Effect.Effect<never, Error.ResponseError | ParseResult.ParseError, A> =>
    Effect.flatMap(
      self.json,
      (body) =>
        parse({
          status: self.status,
          headers: self.headers,
          body
        })
    )
}

/** @internal */
export const schemaNoBody = <
  I extends {
    readonly status?: number
    readonly headers?: Headers.Headers
  },
  A
>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return (self: ClientResponse.ClientResponse): Effect.Effect<never, ParseResult.ParseError, A> =>
    parse({
      status: self.status,
      headers: self.headers
    })
}
