import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as Stream from "effect/Stream"
import type { Unify } from "effect/Unify"
import * as Cookies from "../Cookies.js"
import * as Headers from "../Headers.js"
import * as Error from "../HttpClientError.js"
import type * as ClientRequest from "../HttpClientRequest.js"
import type * as ClientResponse from "../HttpClientResponse.js"
import * as IncomingMessage from "../HttpIncomingMessage.js"
import * as UrlParams from "../UrlParams.js"

/** @internal */
export const TypeId: ClientResponse.TypeId = Symbol.for("@effect/platform/HttpClientResponse") as ClientResponse.TypeId

/** @internal */
export const fromWeb = (
  request: ClientRequest.HttpClientRequest,
  source: globalThis.Response
): ClientResponse.HttpClientResponse => new ClientResponseImpl(request, source)

class ClientResponseImpl extends Inspectable.Class implements ClientResponse.HttpClientResponse {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  readonly [TypeId]: ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.HttpClientRequest,
    private readonly source: globalThis.Response
  ) {
    super()
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
    this[TypeId] = TypeId
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    })
  }

  get status(): number {
    return this.source.status
  }

  get headers(): Headers.Headers {
    return Headers.fromInput(this.source.headers as any)
  }

  cachedCookies?: Cookies.Cookies
  get cookies(): Cookies.Cookies {
    if (this.cachedCookies) {
      return this.cachedCookies
    }
    return this.cachedCookies = Cookies.fromSetCookie(this.source.headers.getSetCookie())
  }

  get remoteAddress(): Option.Option<string> {
    return Option.none()
  }

  get stream(): Stream.Stream<Uint8Array, Error.ResponseError> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body!, (cause) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
        }))
      : Stream.fail(
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "EmptyBody",
          description: "can not create stream from empty body"
        })
      )
  }

  get json(): Effect.Effect<unknown, Error.ResponseError> {
    return Effect.tryMap(this.text, {
      try: (text) => text === "" ? null : JSON.parse(text) as unknown,
      catch: (cause) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
        })
    })
  }

  private textBody?: Effect.Effect<string, Error.ResponseError>
  get text(): Effect.Effect<string, Error.ResponseError> {
    return this.textBody ??= Effect.tryPromise({
      try: () => this.source.text(),
      catch: (cause) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
        })
    }).pipe(Effect.cached, Effect.runSync)
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.ResponseError> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (cause) =>
          new Error.ResponseError({
            request: this.request,
            response: this,
            reason: "Decode",
            cause
          })
      }))
  }

  private formDataBody?: Effect.Effect<FormData, Error.ResponseError>
  get formData(): Effect.Effect<FormData, Error.ResponseError> {
    return this.formDataBody ??= Effect.tryPromise({
      try: () => this.source.formData(),
      catch: (cause) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
        })
    }).pipe(Effect.cached, Effect.runSync)
  }

  private arrayBufferBody?: Effect.Effect<ArrayBuffer, Error.ResponseError>
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.ResponseError> {
    return this.arrayBufferBody ??= Effect.tryPromise({
      try: () => this.source.arrayBuffer(),
      catch: (cause) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
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
>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const parse = Schema.decodeUnknown(schema, options)
  return (self: ClientResponse.HttpClientResponse): Effect.Effect<A, Error.ResponseError | ParseResult.ParseError, R> =>
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
>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const parse = Schema.decodeUnknown(schema, options)
  return (self: ClientResponse.HttpClientResponse): Effect.Effect<A, ParseResult.ParseError, R> =>
    parse({
      status: self.status,
      headers: self.headers
    })
}

/** @internal */
export const stream = <E, R>(effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>) =>
  Stream.unwrap(Effect.map(effect, (_) => _.stream))

/** @internal */
export const matchStatus = dual<
  <
    const Cases extends {
      readonly [status: number]: (_: ClientResponse.HttpClientResponse) => any
      readonly "2xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "3xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "4xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "5xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly orElse: (_: ClientResponse.HttpClientResponse) => any
    }
  >(
    cases: Cases
  ) => (self: ClientResponse.HttpClientResponse) => Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never,
  <
    const Cases extends {
      readonly [status: number]: (_: ClientResponse.HttpClientResponse) => any
      readonly "2xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "3xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "4xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly "5xx"?: (_: ClientResponse.HttpClientResponse) => any
      readonly orElse: (_: ClientResponse.HttpClientResponse) => any
    }
  >(
    self: ClientResponse.HttpClientResponse,
    cases: Cases
  ) => Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never
>(2, (self, cases) => {
  const status = self.status
  if (cases[status]) {
    return cases[status](self)
  } else if (status >= 200 && status < 300 && cases["2xx"]) {
    return cases["2xx"](self)
  } else if (status >= 300 && status < 400 && cases["3xx"]) {
    return cases["3xx"](self)
  } else if (status >= 400 && status < 500 && cases["4xx"]) {
    return cases["4xx"](self)
  } else if (status >= 500 && status < 600 && cases["5xx"]) {
    return cases["5xx"](self)
  }
  return cases.orElse(self)
})

/** @internal */
export const filterStatus = dual<
  (
    f: (status: number) => boolean
  ) => (
    self: ClientResponse.HttpClientResponse
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.ResponseError>,
  (
    self: ClientResponse.HttpClientResponse,
    f: (status: number) => boolean
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.ResponseError>
>(
  2,
  (self, f) =>
    Effect.suspend(() =>
      f(self.status) ? Effect.succeed(self) : Effect.fail(
        new Error.ResponseError({
          response: self,
          request: self.request,
          reason: "StatusCode",
          description: "invalid status code"
        })
      )
    )
)

/** @internal */
export const filterStatusOk = (
  self: ClientResponse.HttpClientResponse
): Effect.Effect<ClientResponse.HttpClientResponse, Error.ResponseError> =>
  self.status >= 200 && self.status < 300 ? Effect.succeed(self) : Effect.fail(
    new Error.ResponseError({
      response: self,
      request: self.request,
      reason: "StatusCode",
      description: "non 2xx status code"
    })
  )
