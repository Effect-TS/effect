import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Ref from "effect/Ref"
import type * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Cookies from "../Cookies.js"
import * as Headers from "../Headers.js"
import type * as Client from "../HttpClient.js"
import * as Error from "../HttpClientError.js"
import type * as ClientRequest from "../HttpClientRequest.js"
import type * as ClientResponse from "../HttpClientResponse.js"
import * as Method from "../HttpMethod.js"
import * as TraceContext from "../HttpTraceContext.js"
import * as UrlParams from "../UrlParams.js"
import * as internalBody from "./httpBody.js"
import * as internalRequest from "./httpClientRequest.js"
import * as internalResponse from "./httpClientResponse.js"

/** @internal */
export const TypeId: Client.TypeId = Symbol.for(
  "@effect/platform/HttpClient"
) as Client.TypeId

/** @internal */
export const tag = Context.GenericTag<Client.HttpClient.Default>("@effect/platform/HttpClient")

/** @internal */
export const currentTracerDisabledWhen = globalValue(
  Symbol.for("@effect/platform/HttpClient/tracerDisabledWhen"),
  () => FiberRef.unsafeMake<Predicate.Predicate<ClientRequest.HttpClientRequest>>(constFalse)
)

/** @internal */
export const withTracerDisabledWhen = dual<
  (
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ) => Effect.Effect<A, E, R>
>(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const currentTracerPropagation = globalValue(
  Symbol.for("@effect/platform/HttpClient/currentTracerPropagation"),
  () => FiberRef.unsafeMake(true)
)

/** @internal */
export const withTracerPropagation = dual<
  (
    enabled: boolean
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    enabled: boolean
  ) => Effect.Effect<A, E, R>
>(2, (self, enabled) => Effect.locally(self, currentTracerPropagation, enabled))

/** @internal */
export const currentFetchOptions = globalValue(
  Symbol.for("@effect/platform/HttpClient/currentFetchOptions"),
  () => FiberRef.unsafeMake<RequestInit>({})
)

/** @internal */
export const withFetchOptions = dual<
  (
    options: RequestInit
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    options: RequestInit
  ) => Effect.Effect<A, E, R>
>(2, (self, options) => Effect.locally(self, currentFetchOptions, options))

const clientProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const isClient = (u: unknown): u is Client.HttpClient<unknown, unknown, unknown> => Predicate.hasProperty(u, TypeId)

/** @internal */
export const make = <E2, R2, A, E, R>(
  execute: (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Effect.Effect<A, E, R>,
  preprocess: Client.HttpClient.Preprocess<E2, R2>
): Client.HttpClient<A, E, R> => {
  function client(request: ClientRequest.HttpClientRequest) {
    return execute(preprocess(request))
  }
  Object.setPrototypeOf(client, clientProto)
  ;(client as any).preprocess = preprocess
  ;(client as any).execute = execute
  return client as any
}

/** @internal */
export const makeDefault = (
  f: (
    request: ClientRequest.HttpClientRequest,
    url: URL,
    signal: AbortSignal,
    fiber: Fiber.RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Scope.Scope>
): Client.HttpClient.Default =>
  make((effect) =>
    Effect.flatMap(effect, (request) =>
      Effect.withFiberRuntime((fiber) => {
        const scope = Context.unsafeGet(fiber.getFiberRef(FiberRef.currentContext), Scope.Scope)
        const controller = new AbortController()
        const addAbort = Scope.addFinalizer(scope, Effect.sync(() => controller.abort()))
        const urlResult = UrlParams.makeUrl(request.url, request.urlParams, request.hash)
        if (urlResult._tag === "Left") {
          return Effect.fail(new Error.RequestError({ request, reason: "InvalidUrl", cause: urlResult.left }))
        }
        const url = urlResult.right
        const tracerDisabled = !fiber.getFiberRef(FiberRef.currentTracerEnabled) ||
          fiber.getFiberRef(currentTracerDisabledWhen)(request)
        if (tracerDisabled) {
          return Effect.zipRight(
            addAbort,
            f(request, url, controller.signal, fiber)
          )
        }
        return Effect.zipRight(
          addAbort,
          Effect.useSpan(
            `http.client ${request.method}`,
            { kind: "client", captureStackTrace: false },
            (span) => {
              span.attribute("http.request.method", request.method)
              span.attribute("server.address", url.origin)
              if (url.port !== "") {
                span.attribute("server.port", +url.port)
              }
              span.attribute("url.full", url.toString())
              span.attribute("url.path", url.pathname)
              span.attribute("url.scheme", url.protocol.slice(0, -1))
              const query = url.search.slice(1)
              if (query !== "") {
                span.attribute("url.query", query)
              }
              const redactedHeaderNames = fiber.getFiberRef(Headers.currentRedactedNames)
              const redactedHeaders = Headers.redact(request.headers, redactedHeaderNames)
              for (const name in redactedHeaders) {
                span.attribute(`http.request.header.${name}`, String(redactedHeaders[name]))
              }
              request = fiber.getFiberRef(currentTracerPropagation)
                ? internalRequest.setHeaders(request, TraceContext.toHeaders(span))
                : request
              return Effect.tap(
                Effect.withParentSpan(
                  f(
                    request,
                    url,
                    controller.signal,
                    fiber
                  ),
                  span
                ),
                (response) => {
                  span.attribute("http.response.status_code", response.status)
                  const redactedHeaders = Headers.redact(response.headers, redactedHeaderNames)
                  for (const name in redactedHeaders) {
                    span.attribute(`http.response.header.${name}`, String(redactedHeaders[name]))
                  }
                }
              )
            }
          )
        )
      })), Effect.succeed as Client.HttpClient.Preprocess<never, never>)

/** @internal */
export const Fetch = Context.GenericTag<Client.Fetch, typeof globalThis.fetch>(
  "@effect/platform/HttpClient/Fetch"
)

/** @internal */
export const fetch: Client.HttpClient.Default = makeDefault((request, url, signal, fiber) => {
  const context = fiber.getFiberRef(FiberRef.currentContext)
  const fetch: typeof globalThis.fetch = context.unsafeMap.get(Fetch.key) ?? globalThis.fetch
  const options = fiber.getFiberRef(currentFetchOptions)
  const headers = new globalThis.Headers(request.headers)
  const send = (body: BodyInit | undefined) =>
    Effect.map(
      Effect.tryPromise({
        try: () =>
          fetch(url, {
            ...options,
            method: request.method,
            headers,
            body,
            duplex: request.body._tag === "Stream" ? "half" : undefined,
            signal
          } as any),
        catch: (cause) =>
          new Error.RequestError({
            request,
            reason: "Transport",
            cause
          })
      }),
      (response) => internalResponse.fromWeb(request, response)
    )
  if (Method.hasBody(request.method)) {
    switch (request.body._tag) {
      case "Raw":
      case "Uint8Array":
        return send(request.body.body as any)
      case "FormData":
        return send(request.body.formData)
      case "Stream":
        return Effect.flatMap(Stream.toReadableStreamEffect(request.body.stream), send)
    }
  }
  return send(undefined)
})

/** @internal */
export const transform = dual<
  <A, E, R, A1, E1, R1>(
    f: (
      effect: Effect.Effect<A, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<A1, E1, R1>
  ) => (self: Client.HttpClient<A, E, R>) => Client.HttpClient<A1, E | E1, R | R1>,
  <A, E, R, A1, E1, R1>(
    self: Client.HttpClient<A, E, R>,
    f: (
      effect: Effect.Effect<A, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<A1, E1, R1>
  ) => Client.HttpClient<A1, E | E1, R | R1>
>(2, (self, f) =>
  make(
    Effect.flatMap((request) => f(self.execute(Effect.succeed(request)), request)),
    self.preprocess
  ))

/** @internal */
export const filterStatus = dual<
  (
    f: (status: number) => boolean
  ) => <E, R>(
    self: Client.HttpClient.WithResponse<E, R>
  ) => Client.HttpClient.WithResponse<E | Error.ResponseError, R>,
  <E, R>(
    self: Client.HttpClient.WithResponse<E, R>,
    f: (status: number) => boolean
  ) => Client.HttpClient.WithResponse<E | Error.ResponseError, R>
>(2, (self, f) =>
  transform(self, (effect, request) =>
    Effect.filterOrFail(
      effect,
      (response) => f(response.status),
      (response) =>
        new Error.ResponseError({
          request,
          response,
          reason: "StatusCode",
          description: "invalid status code"
        })
    )))

/** @internal */
export const filterStatusOk = <E, R>(
  self: Client.HttpClient.WithResponse<E, R>
): Client.HttpClient.WithResponse<E | Error.ResponseError, R> =>
  transform(self, (effect, request) =>
    Effect.filterOrFail(
      effect,
      (response) => response.status >= 200 && response.status < 300,
      (response) =>
        new Error.ResponseError({
          request,
          response,
          reason: "StatusCode",
          description: "non 2xx status code"
        })
    ))

/** @internal */
export const fetchOk: Client.HttpClient.Default = filterStatusOk(fetch)

/** @internal */
export const layer = Layer.succeed(tag, fetch)

/** @internal */
export const transformResponse = dual<
  <A, E, R, A1, E1, R1>(
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ) => (self: Client.HttpClient<A, E, R>) => Client.HttpClient<A1, E1, R1>,
  <A, E, R, A1, E1, R1>(
    self: Client.HttpClient<A, E, R>,
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ) => Client.HttpClient<A1, E1, R1>
>(2, (self, f) => make((request) => f(self.execute(request)), self.preprocess))

/** @internal */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): <A, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <
    R,
    E,
    A,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    A1,
    R1,
    E1
  >(
    self: Client.HttpClient<A, E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): Client.HttpClient<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
} = dual(
  3,
  <
    R,
    E,
    A,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    R1,
    E1,
    A1
  >(
    self: Client.HttpClient<A, E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): Client.HttpClient<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R> => transformResponse(self, Effect.catchTag(tag, f))
)

/** @internal */
export const catchTags: {
  <
    E,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<any, any, any>
      }
      & (unknown extends E ? {}
        : {
          [
            K in Exclude<
              keyof Cases,
              Extract<E, { _tag: string }>["_tag"]
            >
          ]: never
        })
  >(
    cases: Cases
  ): <A, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer A, any, any> ? A
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer R> ? R
        : never
    }[keyof Cases]
  >
  <
    A,
    E extends { _tag: string },
    R,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<any, any, any>
      }
      & (unknown extends E ? {}
        : {
          [
            K in Exclude<
              keyof Cases,
              Extract<E, { _tag: string }>["_tag"]
            >
          ]: never
        })
  >(
    self: Client.HttpClient<A, E, R>,
    cases: Cases
  ): Client.HttpClient<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer A, any, any> ? A
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer R> ? R
        : never
    }[keyof Cases]
  >
} = dual(
  2,
  <
    A,
    E extends { _tag: string },
    R,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<any, any, any>
      }
      & (unknown extends E ? {}
        : {
          [
            K in Exclude<
              keyof Cases,
              Extract<E, { _tag: string }>["_tag"]
            >
          ]: never
        })
  >(
    self: Client.HttpClient<A, E, R>,
    cases: Cases
  ): Client.HttpClient<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer A, any, any> ? A
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer R> ? R
        : never
    }[keyof Cases]
  > => transformResponse(self, Effect.catchTags(cases))
)

/** @internal */
export const catchAll: {
  <E, A2, E2, R2>(
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): <A, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A2 | A, E2, R | R2>
  <A, E, R, A2, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): Client.HttpClient<A2 | A, E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): Client.HttpClient<A2 | A, E2, R | R2> => transformResponse(self, Effect.catchAll(f))
)

/** @internal */
export const filterOrElse = dual<
  <A, B, E2, R2>(
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<B, E2, R2>
  ) => <E, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<A | B, E2 | E, R2 | R>,
  <A, E, R, B, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<B, E2, R2>
  ) => Client.HttpClient<A | B, E2 | E, R2 | R>
>(3, (self, f, orElse) => transformResponse(self, Effect.filterOrElse(f, orElse)))

/** @internal */
export const filterOrFail = dual<
  <A, E2>(
    f: Predicate.Predicate<A>,
    orFailWith: (a: A) => E2
  ) => <E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A, E2 | E, R>,
  <A, E, R, E2>(
    self: Client.HttpClient<A, E, R>,
    f: Predicate.Predicate<A>,
    orFailWith: (a: A) => E2
  ) => Client.HttpClient<A, E2 | E, R>
>(3, (self, f, orFailWith) => transformResponse(self, Effect.filterOrFail(f, orFailWith)))

/** @internal */
export const map = dual<
  <A, B>(
    f: (a: A) => B
  ) => <E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<B, E, R>,
  <A, E, R, B>(
    self: Client.HttpClient<A, E, R>,
    f: (a: A) => B
  ) => Client.HttpClient<B, E, R>
>(2, (self, f) => transformResponse(self, Effect.map(f)))

/** @internal */
export const mapEffect = dual<
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ) => <E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<B, E | E2, R | R2>,
  <A, E, R, B, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ) => Client.HttpClient<B, E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.flatMap(f)))

/** @internal */
export const scoped = <A, E, R>(
  self: Client.HttpClient<A, E, R>
): Client.HttpClient<A, E, Exclude<R, Scope.Scope>> => transformResponse(self, Effect.scoped)

/** @internal */
export const mapEffectScoped = dual<
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ) => <E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<B, E | E2, Exclude<R | R2, Scope.Scope>>,
  <A, E, R, B, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ) => Client.HttpClient<B, E | E2, Exclude<R | R2, Scope.Scope>>
>(2, (self, f) => scoped(mapEffect(self, f)))

/** @internal */
export const mapRequest = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <A, E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A, E, R>,
  <A, E, R>(
    self: Client.HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient<A, E, R>
>(2, (self, f) => make(self.execute, (request) => Effect.map(self.preprocess(request), f)))

/** @internal */
export const mapRequestEffect = dual<
  <E2, R2>(
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => <A, E, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<A, E | E2, R | R2>,
  <A, E, R, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient<A, E | E2, R | R2>
>(2, (self, f) => make(self.execute as any, (request) => Effect.flatMap(self.preprocess(request), f)))

/** @internal */
export const mapInputRequest = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <A, E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A, E, R>,
  <A, E, R>(
    self: Client.HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient<A, E, R>
>(2, (self, f) => make(self.execute, (request) => self.preprocess(f(request))))

/** @internal */
export const mapInputRequestEffect = dual<
  <E2, R2>(
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => <A, E, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<A, E | E2, R | R2>,
  <A, E, R, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient<A, E | E2, R | R2>
>(2, (self, f) => make(self.execute as any, (request) => Effect.flatMap(f(request), self.preprocess)))

/** @internal */
export const retry: {
  <R1, E extends E0, E0, B>(
    policy: Schedule.Schedule<B, E0, R1>
  ): <A, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A, E, R1 | R>
  <A, E extends E0, E0, R, R1, B>(
    self: Client.HttpClient<A, E, R>,
    policy: Schedule.Schedule<B, E0, R1>
  ): Client.HttpClient<A, E, R | R1>
} = dual(
  2,
  <A, E extends E0, E0, R, R1, B>(
    self: Client.HttpClient<A, E, R>,
    policy: Schedule.Schedule<B, E0, R1>
  ): Client.HttpClient<A, E, R | R1> => transformResponse(self, Effect.retry(policy))
)

/** @internal */
export const schemaFunction = dual<
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ) => <A, E, R>(
    self: Client.HttpClient<A, E, R>
  ) => (
    request: ClientRequest.HttpClientRequest
  ) => (
    a: SA
  ) => Effect.Effect<A, E | ParseResult.ParseError | Error.RequestError, SR | R>,
  <A, E, R, SA, SI, SR>(
    self: Client.HttpClient<A, E, R>,
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ) => (
    request: ClientRequest.HttpClientRequest
  ) => (
    a: SA
  ) => Effect.Effect<A, E | ParseResult.ParseError | Error.RequestError, SR | R>
>((args) => isClient(args[0]), (self, schema, options) => {
  const encode = Schema.encode(schema, options)
  return (request) => (a) =>
    Effect.flatMap(
      Effect.tryMap(encode(a), {
        try: (body) => new TextEncoder().encode(JSON.stringify(body)),
        catch: (cause) =>
          new Error.RequestError({
            request,
            reason: "Encode",
            cause
          })
      }),
      (body) =>
        self(
          internalRequest.setBody(
            request,
            internalBody.uint8Array(body, "application/json")
          )
        )
    )
})

/** @internal */
export const tap = dual<
  <A, _, E2, R2>(
    f: (a: A) => Effect.Effect<_, E2, R2>
  ) => <E, R>(self: Client.HttpClient<A, E, R>) => Client.HttpClient<A, E | E2, R | R2>,
  <A, E, R, _, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (a: A) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient<A, E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tap(f)))

/** @internal */
export const tapRequest = dual<
  <_, E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => <A, E, R>(
    self: Client.HttpClient<A, E, R>
  ) => Client.HttpClient<A, E | E2, R | R2>,
  <A, E, R, _, E2, R2>(
    self: Client.HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient<A, E | E2, R | R2>
>(2, (self, f) => make(self.execute as any, (request) => Effect.tap(self.preprocess(request), f)))

/** @internal */
export const withCookiesRef = dual<
  (
    ref: Ref.Ref<Cookies.Cookies>
  ) => <E, R>(self: Client.HttpClient.WithResponse<E, R>) => Client.HttpClient.WithResponse<E, R>,
  <E, R>(
    self: Client.HttpClient.WithResponse<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ) => Client.HttpClient.WithResponse<E, R>
>(
  2,
  <E, R>(
    self: Client.HttpClient.WithResponse<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ): Client.HttpClient.WithResponse<E, R> =>
    make(
      (request: Effect.Effect<ClientRequest.HttpClientRequest, E, R>) =>
        Effect.tap(
          self.execute(request),
          (response) => Ref.update(ref, (cookies) => Cookies.merge(cookies, response.cookies))
        ),
      (request) =>
        Effect.flatMap(self.preprocess(request), (request) =>
          Effect.map(
            Ref.get(ref),
            (cookies) =>
              Cookies.isEmpty(cookies)
                ? request
                : internalRequest.setHeader(request, "cookie", Cookies.toCookieHeader(cookies))
          ))
    )
)

/** @internal */
export const followRedirects = dual<
  (
    maxRedirects?: number | undefined
  ) => <E, R>(self: Client.HttpClient.WithResponse<E, R>) => Client.HttpClient.WithResponse<E, R>,
  <E, R>(
    self: Client.HttpClient.WithResponse<E, R>,
    maxRedirects?: number | undefined
  ) => Client.HttpClient.WithResponse<E, R>
>((args) => isClient(args[0]), <E, R>(
  self: Client.HttpClient.WithResponse<E, R>,
  maxRedirects?: number | undefined
): Client.HttpClient.WithResponse<E, R> =>
  make(
    (request) => {
      const loop = (
        request: ClientRequest.HttpClientRequest,
        redirects: number
      ): Effect.Effect<ClientResponse.HttpClientResponse, E, R> =>
        Effect.flatMap(
          self.execute(Effect.succeed(request)),
          (response) =>
            response.status >= 300 && response.status < 400 && response.headers.location &&
              redirects < (maxRedirects ?? 10)
              ? loop(
                internalRequest.setUrl(
                  request,
                  response.headers.location
                ),
                redirects + 1
              )
              : Effect.succeed(response)
        )
      return Effect.flatMap(request, (request) => loop(request, 0))
    },
    self.preprocess
  ))
