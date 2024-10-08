import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Cookies from "../Cookies.js"
import * as Headers from "../Headers.js"
import type * as Client from "../HttpClient.js"
import * as Error from "../HttpClientError.js"
import type * as ClientRequest from "../HttpClientRequest.js"
import type * as ClientResponse from "../HttpClientResponse.js"
import * as TraceContext from "../HttpTraceContext.js"
import * as UrlParams from "../UrlParams.js"
import * as internalRequest from "./httpClientRequest.js"
import * as internalResponse from "./httpClientResponse.js"

/** @internal */
export const TypeId: Client.TypeId = Symbol.for(
  "@effect/platform/HttpClient"
) as Client.TypeId

/** @internal */
export const tag = Context.GenericTag<Client.HttpClient>("@effect/platform/HttpClient")

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

const ClientProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  ...Inspectable.BaseProto,
  toJSON() {
    return {
      _id: "@effect/platform/HttpClient"
    }
  },
  get(this: Client.HttpClient, url: string | URL, options?: ClientRequest.Options.NoBody) {
    return this.execute(internalRequest.get(url, options))
  },
  head(this: Client.HttpClient, url: string | URL, options?: ClientRequest.Options.NoBody) {
    return this.execute(internalRequest.head(url, options))
  },
  post(this: Client.HttpClient, url: string | URL, options: ClientRequest.Options.NoUrl) {
    return this.execute(internalRequest.post(url, options))
  },
  put(this: Client.HttpClient, url: string | URL, options: ClientRequest.Options.NoUrl) {
    return this.execute(internalRequest.put(url, options))
  },
  patch(this: Client.HttpClient, url: string | URL, options: ClientRequest.Options.NoUrl) {
    return this.execute(internalRequest.patch(url, options))
  },
  del(this: Client.HttpClient, url: string | URL, options?: ClientRequest.Options.NoUrl) {
    return this.execute(internalRequest.del(url, options))
  },
  options(this: Client.HttpClient, url: string | URL, options?: ClientRequest.Options.NoBody) {
    return this.execute(internalRequest.options(url, options))
  }
}

const isClient = (u: unknown): u is Client.HttpClient<unknown, unknown> => Predicate.hasProperty(u, TypeId)

interface HttpClientImpl<E, R> extends Client.HttpClient<E, R> {
  readonly preprocess: Client.HttpClient.Preprocess<E, R>
  readonly postprocess: Client.HttpClient.Postprocess<E, R>
}

/** @internal */
export const makeWith = <E2, R2, E, R>(
  postprocess: (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
  preprocess: Client.HttpClient.Preprocess<E2, R2>
): Client.HttpClient<E, R> => {
  const self = Object.create(ClientProto)
  self.preprocess = preprocess
  self.postprocess = postprocess
  self.execute = function(request: ClientRequest.HttpClientRequest) {
    return postprocess(preprocess(request))
  }
  return self
}

/** @internal */
export const make = (
  f: (
    request: ClientRequest.HttpClientRequest,
    url: URL,
    signal: AbortSignal,
    fiber: Fiber.RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Scope.Scope>
): Client.HttpClient =>
  makeWith((effect) =>
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

export const {
  /** @internal */
  del,
  /** @internal */
  execute,
  /** @internal */
  get,
  /** @internal */
  head,
  /** @internal */
  options,
  /** @internal */
  patch,
  /** @internal */
  post,
  /** @internal */
  put
} = Effect.serviceFunctions(tag)

/** @internal */
export const transform = dual<
  <E, R, E1, R1>(
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => (self: Client.HttpClient<E, R>) => Client.HttpClient<E | E1, R | R1>,
  <E, R, E1, R1>(
    self: Client.HttpClient<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => Client.HttpClient<E | E1, R | R1>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(
    Effect.flatMap((request) => f(client.postprocess(Effect.succeed(request)), request)),
    client.preprocess
  )
})

/** @internal */
export const filterStatus = dual<
  (
    f: (status: number) => boolean
  ) => <E, R>(
    self: Client.HttpClient<E, R>
  ) => Client.HttpClient<E | Error.ResponseError, R>,
  <E, R>(
    self: Client.HttpClient<E, R>,
    f: (status: number) => boolean
  ) => Client.HttpClient<E | Error.ResponseError, R>
>(2, (self, f) => transformResponse(self, Effect.flatMap(internalResponse.filterStatus(f))))

/** @internal */
export const filterStatusOk = <E, R>(
  self: Client.HttpClient<E, R>
): Client.HttpClient<E | Error.ResponseError, R> =>
  transformResponse(self, Effect.flatMap(internalResponse.filterStatusOk))

/** @internal */
export const transformResponse = dual<
  <E, R, E1, R1>(
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => (self: Client.HttpClient<E, R>) => Client.HttpClient<E1, R1>,
  <E, R, E1, R1>(
    self: Client.HttpClient<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => Client.HttpClient<E1, R1>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith((request) => f(client.postprocess(request)), client.preprocess)
})

/** @internal */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): <R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E1 | Exclude<E, { _tag: K }>, R1 | R>
  <
    R,
    E,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    R1,
    E1
  >(
    self: Client.HttpClient<E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): Client.HttpClient<E1 | Exclude<E, { _tag: K }>, R1 | R>
} = dual(
  3,
  <
    R,
    E,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    R1,
    E1
  >(
    self: Client.HttpClient<E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): Client.HttpClient<E1 | Exclude<E, { _tag: K }>, R1 | R> => transformResponse(self, Effect.catchTag(tag, f))
)

/** @internal */
export const catchTags: {
  <
    E,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>
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
  ): <R>(self: Client.HttpClient<E, R>) => Client.HttpClient<
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
    E extends { _tag: string },
    R,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>
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
    self: Client.HttpClient<E, R>,
    cases: Cases
  ): Client.HttpClient<
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
    E extends { _tag: string },
    R,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>
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
    self: Client.HttpClient<E, R>,
    cases: Cases
  ): Client.HttpClient<
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
  > => transformResponse(self, Effect.catchTags(cases) as any)
)

/** @internal */
export const catchAll: {
  <E, E2, R2>(
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): <R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E2, R | R2>
  <E, R, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient<E2, R | R2>
} = dual(
  2,
  <E, R, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient<E2, R | R2> => transformResponse(self, Effect.catchAll(f))
)

/** @internal */
export const filterOrElse: {
  <E2, R2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): <E, R>(
    self: Client.HttpClient<E, R>
  ) => Client.HttpClient<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: Client.HttpClient<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient<E2 | E, R2 | R>
} = dual(3, (self, f, orElse) => transformResponse(self, Effect.filterOrElse(f, orElse)))

/** @internal */
export const filterOrFail: {
  <E2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E2 | E, R>
  <E, R, E2>(
    self: Client.HttpClient<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): Client.HttpClient<E2 | E, R>
} = dual(3, (self, f, orFailWith) => transformResponse(self, Effect.filterOrFail(f, orFailWith)))

/** @internal */
export const mapRequest = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R>,
  <E, R>(
    self: Client.HttpClient<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient<E, R>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess, (request) => Effect.map(client.preprocess(request), f))
})

/** @internal */
export const mapRequestEffect = dual<
  <E2, R2>(
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => <E, R>(
    self: Client.HttpClient<E, R>
  ) => Client.HttpClient<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.flatMap(client.preprocess(request), f))
})

/** @internal */
export const mapRequestInput = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R>,
  <E, R>(
    self: Client.HttpClient<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient<E, R>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess, (request) => client.preprocess(f(request)))
})

/** @internal */
export const mapRequestInputEffect = dual<
  <E2, R2>(
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => <E, R>(
    self: Client.HttpClient<E, R>
  ) => Client.HttpClient<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.flatMap(f(request), client.preprocess))
})

/** @internal */
export const retry: {
  <E, O extends Effect.Retry.Options<E>>(
    options: O
  ): <R>(self: Client.HttpClient<E, R>) => Client.Retry.Return<R, E, O>
  <B, E, R1>(
    policy: Schedule.Schedule<B, NoInfer<E>, R1>
  ): <R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R1 | R>
  <E, R, O extends Effect.Retry.Options<E>>(
    self: Client.HttpClient<E, R>,
    options: O
  ): Client.Retry.Return<R, E, O>
  <E, R, B, R1>(
    self: Client.HttpClient<E, R>,
    policy: Schedule.Schedule<B, E, R1>
  ): Client.HttpClient<E, R1 | R>
} = dual(
  2,
  <E extends E0, E0, R, R1, B>(
    self: Client.HttpClient<E, R>,
    policy: Schedule.Schedule<B, E0, R1>
  ): Client.HttpClient<E, R | R1> => transformResponse(self, Effect.retry(policy))
)

/** @internal */
export const retryTransient: {
  <B, E, R1 = never>(
    options: {
      readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<E>, R1>
  ): <R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R1 | R>
  <E, R, B, R1 = never>(
    self: Client.HttpClient<E, R>,
    options: {
      readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<E>, R1>
  ): Client.HttpClient<E, R1 | R>
} = dual(
  2,
  <E extends E0, E0, R, B, R1 = never>(
    self: Client.HttpClient<E, R>,
    options: {
      readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<E>, R1>
  ): Client.HttpClient<E, R | R1> =>
    transformResponse(
      self,
      Effect.retry({
        while: (error) =>
          Error.isHttpClientError(error) &&
          ((error._tag === "RequestError" && error.reason === "Transport") ||
            (error._tag === "ResponseError" && error.response.status >= 429)),
        schedule: Schedule.ScheduleTypeId in options ? options : options.schedule,
        times: Schedule.ScheduleTypeId in options ? undefined : options.times
      })
    )
)

/** @internal */
export const tap = dual<
  <_, E2, R2>(
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ) => <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E | E2, R | R2>,
  <E, R, _, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient<E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tap(f)))

/** @internal */
export const tapRequest = dual<
  <_, E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => <E, R>(
    self: Client.HttpClient<E, R>
  ) => Client.HttpClient<E | E2, R | R2>,
  <E, R, _, E2, R2>(
    self: Client.HttpClient<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.tap(client.preprocess(request), f))
})

/** @internal */
export const withCookiesRef = dual<
  (
    ref: Ref.Ref<Cookies.Cookies>
  ) => <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R>,
  <E, R>(
    self: Client.HttpClient<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ) => Client.HttpClient<E, R>
>(
  2,
  <E, R>(
    self: Client.HttpClient<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ): Client.HttpClient<E, R> => {
    const client = self as HttpClientImpl<E, R>
    return makeWith(
      (request: Effect.Effect<ClientRequest.HttpClientRequest, E, R>) =>
        Effect.tap(
          client.postprocess(request),
          (response) => Ref.update(ref, (cookies) => Cookies.merge(cookies, response.cookies))
        ),
      (request) =>
        Effect.flatMap(client.preprocess(request), (request) =>
          Effect.map(
            Ref.get(ref),
            (cookies) =>
              Cookies.isEmpty(cookies)
                ? request
                : internalRequest.setHeader(request, "cookie", Cookies.toCookieHeader(cookies))
          ))
    )
  }
)

/** @internal */
export const followRedirects = dual<
  (
    maxRedirects?: number | undefined
  ) => <E, R>(self: Client.HttpClient<E, R>) => Client.HttpClient<E, R>,
  <E, R>(
    self: Client.HttpClient<E, R>,
    maxRedirects?: number | undefined
  ) => Client.HttpClient<E, R>
>((args) => isClient(args[0]), <E, R>(
  self: Client.HttpClient<E, R>,
  maxRedirects?: number | undefined
): Client.HttpClient<E, R> => {
  const client = self as HttpClientImpl<E, R>
  return makeWith(
    (request) => {
      const loop = (
        request: ClientRequest.HttpClientRequest,
        redirects: number
      ): Effect.Effect<ClientResponse.HttpClientResponse, E, R> =>
        Effect.flatMap(
          client.postprocess(Effect.succeed(request)),
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
    client.preprocess
  )
})

/** @internal */
export const layerMergedContext = <E, R>(
  effect: Effect.Effect<Client.HttpClient, E, R>
): Layer.Layer<Client.HttpClient, E, R> =>
  Layer.effect(
    tag,
    Effect.flatMap(Effect.context<never>(), (context) =>
      Effect.map(effect, (client) =>
        transformResponse(
          client,
          Effect.mapInputContext((input: Context.Context<Scope.Scope>) => Context.merge(context, input))
        )))
  )
