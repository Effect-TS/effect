import * as Cookies from "@effect/platform/Cookies"
import * as Headers from "@effect/platform/Headers"
import type * as Body from "@effect/platform/HttpBody"
import * as Client from "@effect/platform/HttpClient"
import * as Error from "@effect/platform/HttpClientError"
import type * as ClientRequest from "@effect/platform/HttpClientRequest"
import * as ClientResponse from "@effect/platform/HttpClientResponse"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import * as UrlParams from "@effect/platform/UrlParams"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as Undici from "undici"
import type * as NodeClient from "../NodeHttpClient.js"
import * as NodeStream from "../NodeStream.js"

/** @internal */
export const Dispatcher = Context.GenericTag<NodeClient.Dispatcher, Undici.Dispatcher>(
  "@effect/platform-node/NodeHttpClient/Dispatcher"
)

/** @internal */
export const makeDispatcher: Effect.Effect<Undici.Dispatcher, never, Scope.Scope> = Effect.acquireRelease(
  Effect.sync(() => new Undici.Dispatcher()),
  (dispatcher) => Effect.promise(() => dispatcher.close())
)

/** @internal */
export const dispatcherLayer = Layer.scoped(Dispatcher, makeDispatcher)

/** @internal */
export const dispatcherLayerGlobal = Layer.sync(Dispatcher, () => Undici.getGlobalDispatcher())

/** @internal */
export const currentUndiciOptions = globalValue(
  Symbol.for("@effect/platform-node/NodeHttpClient/currentUndici"),
  () => FiberRef.unsafeMake<Partial<Undici.Dispatcher.RequestOptions>>({})
)

/** @internal */
export const withUndiciOptions = dual<
  (
    options: Partial<Undici.Dispatcher.RequestOptions>
  ) => <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    options: Partial<Undici.Dispatcher.RequestOptions>
  ) => Effect.Effect<A, E, R>
>(2, (self, options) => Effect.locally(self, currentUndiciOptions, options))

/** @internal */
export const make = (dispatcher: Undici.Dispatcher): Client.HttpClient.Default =>
  Client.makeDefault((request, url, signal, fiber) =>
    convertBody(request.body).pipe(
      Effect.flatMap((body) =>
        Effect.tryPromise({
          try: () =>
            dispatcher.request({
              ...(fiber.getFiberRef(currentUndiciOptions)),
              signal,
              method: request.method,
              headers: request.headers,
              origin: url.origin,
              path: url.pathname + url.search + url.hash,
              body,
              // leave timeouts to Effect.timeout etc
              headersTimeout: 60 * 60 * 1000,
              bodyTimeout: 0,
              throwOnError: false
            }),
          catch: (error) =>
            new Error.RequestError({
              request,
              reason: "Transport",
              error
            })
        })
      ),
      Effect.map((response) => new ClientResponseImpl(request, response))
    )
  )

function convertBody(
  body: Body.HttpBody
): Effect.Effect<Exclude<Undici.Dispatcher.DispatchOptions["body"], undefined>> {
  switch (body._tag) {
    case "Empty": {
      return Effect.succeed(null)
    }
    case "Uint8Array":
    case "Raw": {
      return Effect.succeed(body.body as Uint8Array)
    }
    case "FormData": {
      return Effect.succeed(body.formData as Undici.FormData)
    }
    case "Stream": {
      return NodeStream.toReadable(body.stream)
    }
  }
}

function noopErrorHandler(_: any) {}

class ClientResponseImpl extends Inspectable.Class implements ClientResponse.HttpClientResponse {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  readonly [ClientResponse.TypeId]: ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.HttpClientRequest,
    readonly source: Undici.Dispatcher.ResponseData
  ) {
    super()
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
    this[ClientResponse.TypeId] = ClientResponse.TypeId
    source.body.on("error", noopErrorHandler)
  }

  get status() {
    return this.source.statusCode!
  }

  get statusText() {
    return undefined
  }

  cachedCookies?: Cookies.Cookies
  get cookies(): Cookies.Cookies {
    if (this.cachedCookies !== undefined) {
      return this.cachedCookies
    }
    const header = this.source.headers["set-cookie"]
    if (header !== undefined) {
      return this.cachedCookies = Cookies.fromSetCookie(Array.isArray(header) ? header : [header])
    }
    return this.cachedCookies = Cookies.empty
  }

  get headers(): Headers.Headers {
    return Headers.fromInput(this.source.headers)
  }

  get remoteAddress(): Option.Option<string> {
    return Option.none()
  }

  get stream(): Stream.Stream<Uint8Array, Error.ResponseError> {
    return NodeStream.fromReadable(() => this.source.body, (_) =>
      new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        error: _
      }))
  }

  get json(): Effect.Effect<unknown, Error.ResponseError> {
    return Effect.tryMap(this.text, {
      try: (text) => text === "" ? null : JSON.parse(text) as unknown,
      catch: (_) =>
        new Error.ResponseError({
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
      try: () => this.source.body.text(),
      catch: (_) =>
        new Error.ResponseError({
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
          new Error.ResponseError({
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
      try: () => this.source.body.formData() as Promise<FormData>,
      catch: (_) =>
        new Error.ResponseError({
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
      try: () => this.source.body.arrayBuffer(),
      catch: (_) =>
        new Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    }).pipe(Effect.cached, Effect.runSync)
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    })
  }
}

/** @internal */
export const layerWithoutDispatcher = Layer.effect(Client.HttpClient, Effect.map(Dispatcher, make))

/** @internal */
export const layer = Layer.provide(layerWithoutDispatcher, dispatcherLayerGlobal)
