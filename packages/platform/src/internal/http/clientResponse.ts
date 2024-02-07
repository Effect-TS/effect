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

  get stream(): Stream.Stream<Uint8Array, Error.ResponseError> {
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

  get json(): Effect.Effect<unknown, Error.ResponseError> {
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

  private textBody?: Effect.Effect<string, Error.ResponseError>
  get text(): Effect.Effect<string, Error.ResponseError> {
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

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.ResponseError> {
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

  private formDataBody?: Effect.Effect<FormData, Error.ResponseError>
  get formData(): Effect.Effect<FormData, Error.ResponseError> {
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

  private arrayBufferBody?: Effect.Effect<ArrayBuffer, Error.ResponseError>
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.ResponseError> {
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
  R,
  I extends {
    readonly status?: number | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
    readonly body?: unknown | undefined
  },
  A
>(schema: Schema.Schema<A, I, R>) => {
  const parse = Schema.decodeUnknown(schema)
  return (self: ClientResponse.ClientResponse): Effect.Effect<A, Error.ResponseError | ParseResult.ParseError, R> =>
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
  R,
  I extends {
    readonly status?: number | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
  },
  A
>(schema: Schema.Schema<A, I, R>) => {
  const parse = Schema.decodeUnknown(schema)
  return (self: ClientResponse.ClientResponse): Effect.Effect<A, ParseResult.ParseError, R> =>
    parse({
      status: self.status,
      headers: self.headers
    })
}
