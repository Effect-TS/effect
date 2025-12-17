import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual, flow, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { NoExcessProperties, NoInfer } from "effect/Types"
import * as Cookies from "../Cookies.js"
import * as Headers from "../Headers.js"
import type * as Client from "../HttpClient.js"
import * as Error from "../HttpClientError.js"
import type * as ClientRequest from "../HttpClientRequest.js"
import type * as ClientResponse from "../HttpClientResponse.js"
import * as IncomingMessage from "../HttpIncomingMessage.js"
import * as TraceContext from "../HttpTraceContext.js"
import * as UrlParams from "../UrlParams.js"
import * as internalRequest from "./httpClientRequest.js"
import * as internalResponse from "./httpClientResponse.js"

const ATTR_HTTP_REQUEST_HEADER = (key: string): string => `http.request.header.${key}`
const ATTR_HTTP_REQUEST_METHOD = "http.request.method"
const ATTR_HTTP_RESPONSE_HEADER = (key: string): string => `http.response.header.${key}`
const ATTR_HTTP_RESPONSE_STATUS_CODE = "http.response.status_code"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"
const ATTR_URL_FULL = "url.full"
const ATTR_URL_PATH = "url.path"
const ATTR_URL_SCHEME = "url.scheme"
const ATTR_URL_QUERY = "url.query"

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
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ) => Client.HttpClient.With<E, R>
>(2, (self, pred) => transformResponse(self, Effect.locally(currentTracerDisabledWhen, pred)))

/** @internal */
export const currentTracerPropagation = globalValue(
  Symbol.for("@effect/platform/HttpClient/currentTracerPropagation"),
  () => FiberRef.unsafeMake(true)
)

/** @internal */
export const withTracerPropagation = dual<
  (
    enabled: boolean
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    enabled: boolean
  ) => Client.HttpClient.With<E, R>
>(2, (self, enabled) => transformResponse(self, Effect.locally(currentTracerPropagation, enabled)))

/** @internal */
export const SpanNameGenerator = Context.Reference<Client.SpanNameGenerator>()(
  "@effect/platform/HttpClient/SpanNameGenerator",
  {
    defaultValue: () => (request: ClientRequest.HttpClientRequest) => `http.client ${request.method}`
  }
)

/** @internal */
export const withSpanNameGenerator = dual<
  (
    f: (request: ClientRequest.HttpClientRequest) => string
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    f: (request: ClientRequest.HttpClientRequest) => string
  ) => Client.HttpClient.With<E, R>
>(2, (self, f) => transformResponse(self, Effect.provideService(SpanNameGenerator, f)))

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

const isClient = (u: unknown): u is Client.HttpClient.With<unknown, unknown> => Predicate.hasProperty(u, TypeId)

interface HttpClientImpl<E, R> extends Client.HttpClient.With<E, R> {
  readonly preprocess: Client.HttpClient.Preprocess<E, R>
  readonly postprocess: Client.HttpClient.Postprocess<E, R>
}

/** @internal */
export const makeWith = <E2, R2, E, R>(
  postprocess: (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
  preprocess: Client.HttpClient.Preprocess<E2, R2>
): Client.HttpClient.With<E, R> => {
  const self = Object.create(ClientProto)
  self.preprocess = preprocess
  self.postprocess = postprocess
  self.execute = function(request: ClientRequest.HttpClientRequest) {
    return postprocess(preprocess(request))
  }
  return self
}

const responseRegistry = globalValue(
  "@effect/platform/HttpClient/responseRegistry",
  () => {
    if ("FinalizationRegistry" in globalThis && globalThis.FinalizationRegistry) {
      const registry = new FinalizationRegistry((controller: AbortController) => {
        controller.abort()
      })
      return {
        register(response: ClientResponse.HttpClientResponse, controller: AbortController) {
          registry.register(response, controller, response)
        },
        unregister(response: ClientResponse.HttpClientResponse) {
          registry.unregister(response)
        }
      }
    }

    const timers = new Map<ClientResponse.HttpClientResponse, any>()
    return {
      register(response: ClientResponse.HttpClientResponse, controller: AbortController) {
        timers.set(response, setTimeout(() => controller.abort(), 5000))
      },
      unregister(response: ClientResponse.HttpClientResponse) {
        const timer = timers.get(response)
        if (timer === undefined) return
        clearTimeout(timer)
        timers.delete(response)
      }
    }
  }
)

const scopedRequests = globalValue(
  "@effect/platform/HttpClient/scopedRequests",
  () => new WeakMap<ClientRequest.HttpClientRequest, AbortController>()
)

/** @internal */
export const make = (
  f: (
    request: ClientRequest.HttpClientRequest,
    url: URL,
    signal: AbortSignal,
    fiber: Fiber.RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError>
): Client.HttpClient =>
  makeWith((effect) =>
    Effect.flatMap(effect, (request) =>
      Effect.withFiberRuntime((fiber) => {
        const scopedController = scopedRequests.get(request)
        const controller = scopedController ?? new AbortController()
        const urlResult = UrlParams.makeUrl(request.url, request.urlParams, request.hash)
        if (urlResult._tag === "Left") {
          return Effect.fail(new Error.RequestError({ request, reason: "InvalidUrl", cause: urlResult.left }))
        }
        const url = urlResult.right
        const tracerDisabled = !fiber.getFiberRef(FiberRef.currentTracerEnabled) ||
          fiber.getFiberRef(currentTracerDisabledWhen)(request)
        if (tracerDisabled) {
          const effect = f(request, url, controller.signal, fiber)
          if (scopedController) return effect
          return Effect.uninterruptibleMask((restore) =>
            Effect.matchCauseEffect(restore(effect), {
              onSuccess(response) {
                responseRegistry.register(response, controller)
                return Effect.succeed(new InterruptibleResponse(response, controller))
              },
              onFailure(cause) {
                if (Cause.isInterrupted(cause)) {
                  controller.abort()
                }
                return Effect.failCause(cause)
              }
            })
          )
        }
        const nameGenerator = Context.get(fiber.currentContext, SpanNameGenerator)
        return Effect.useSpan(
          nameGenerator(request),
          { kind: "client", captureStackTrace: false },
          (span) => {
            span.attribute(ATTR_HTTP_REQUEST_METHOD, request.method)
            span.attribute(ATTR_SERVER_ADDRESS, url.origin)
            if (url.port !== "") {
              span.attribute(ATTR_SERVER_PORT, +url.port)
            }
            span.attribute(ATTR_URL_FULL, url.toString())
            span.attribute(ATTR_URL_PATH, url.pathname)
            span.attribute(ATTR_URL_SCHEME, url.protocol.slice(0, -1))
            const query = url.search.slice(1)
            if (query !== "") {
              span.attribute(ATTR_URL_QUERY, query)
            }
            const redactedHeaderNames = fiber.getFiberRef(Headers.currentRedactedNames)
            const redactedHeaders = Headers.redact(request.headers, redactedHeaderNames)
            for (const name in redactedHeaders) {
              span.attribute(ATTR_HTTP_REQUEST_HEADER(name), String(redactedHeaders[name]))
            }
            request = fiber.getFiberRef(currentTracerPropagation)
              ? internalRequest.setHeaders(request, TraceContext.toHeaders(span))
              : request
            return Effect.uninterruptibleMask((restore) =>
              restore(f(request, url, controller.signal, fiber)).pipe(
                Effect.withParentSpan(span),
                Effect.matchCauseEffect({
                  onSuccess: (response) => {
                    span.attribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status)
                    const redactedHeaders = Headers.redact(response.headers, redactedHeaderNames)
                    for (const name in redactedHeaders) {
                      span.attribute(ATTR_HTTP_RESPONSE_HEADER(name), String(redactedHeaders[name]))
                    }
                    if (scopedController) return Effect.succeed(response)
                    responseRegistry.register(response, controller)
                    return Effect.succeed(new InterruptibleResponse(response, controller))
                  },
                  onFailure(cause) {
                    if (!scopedController && Cause.isInterrupted(cause)) {
                      controller.abort()
                    }
                    return Effect.failCause(cause)
                  }
                })
              )
            )
          }
        )
      })), Effect.succeed as Client.HttpClient.Preprocess<never, never>)

class InterruptibleResponse implements ClientResponse.HttpClientResponse {
  constructor(
    readonly original: ClientResponse.HttpClientResponse,
    readonly controller: AbortController
  ) {}

  readonly [internalResponse.TypeId]: ClientResponse.TypeId = internalResponse.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId = IncomingMessage.TypeId

  private applyInterrupt<A, E, R>(effect: Effect.Effect<A, E, R>) {
    return Effect.suspend(() => {
      responseRegistry.unregister(this.original)
      return Effect.onInterrupt(effect, () =>
        Effect.sync(() => {
          this.controller.abort()
        }))
    })
  }

  get request() {
    return this.original.request
  }

  get status() {
    return this.original.status
  }

  get headers() {
    return this.original.headers
  }

  get cookies() {
    return this.original.cookies
  }

  get remoteAddress() {
    return this.original.remoteAddress
  }

  get formData() {
    return this.applyInterrupt(this.original.formData)
  }

  get text() {
    return this.applyInterrupt(this.original.text)
  }

  get json() {
    return this.applyInterrupt(this.original.json)
  }

  get urlParamsBody() {
    return this.applyInterrupt(this.original.urlParamsBody)
  }

  get arrayBuffer() {
    return this.applyInterrupt(this.original.arrayBuffer)
  }

  get stream() {
    return Stream.suspend(() => {
      responseRegistry.unregister(this.original)
      return Stream.ensuring(
        this.original.stream,
        Effect.sync(() => {
          this.controller.abort()
        })
      )
    })
  }

  toJSON() {
    return this.original.toJSON()
  }

  [Inspectable.NodeInspectSymbol]() {
    return this.original[Inspectable.NodeInspectSymbol]()
  }
}

/** @internal */
export const withScope = <E, R>(
  self: Client.HttpClient.With<E, R>
): Client.HttpClient.With<E, R | Scope.Scope> =>
  transform(
    self,
    (effect, request) => {
      const controller = new AbortController()
      scopedRequests.set(request, controller)
      return Effect.zipRight(
        Effect.scopeWith((scope) => Scope.addFinalizer(scope, Effect.sync(() => controller.abort()))),
        effect
      )
    }
  )

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
  ) => (self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E | E1, R | R1>,
  <E, R, E1, R1>(
    self: Client.HttpClient.With<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => Client.HttpClient.With<E | E1, R | R1>
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
    self: Client.HttpClient.With<E, R>
  ) => Client.HttpClient.With<E | Error.ResponseError, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    f: (status: number) => boolean
  ) => Client.HttpClient.With<E | Error.ResponseError, R>
>(2, (self, f) => transformResponse(self, Effect.flatMap(internalResponse.filterStatus(f))))

/** @internal */
export const filterStatusOk = <E, R>(
  self: Client.HttpClient.With<E, R>
): Client.HttpClient.With<E | Error.ResponseError, R> =>
  transformResponse(self, Effect.flatMap(internalResponse.filterStatusOk))

/** @internal */
export const transformResponse = dual<
  <E, R, E1, R1>(
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => (self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E1, R1>,
  <E, R, E1, R1>(
    self: Client.HttpClient.With<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ) => Client.HttpClient.With<E1, R1>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith((request) => f(client.postprocess(request)), client.preprocess)
})

/** @internal */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E1 | Exclude<E, { _tag: K }>, R1 | R>
  <
    R,
    E,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    R1,
    E1
  >(
    self: Client.HttpClient.With<E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): Client.HttpClient.With<E1 | Exclude<E, { _tag: K }>, R1 | R>
} = dual(
  3,
  <
    R,
    E,
    K extends E extends { _tag: string } ? E["_tag"] : never,
    R1,
    E1
  >(
    self: Client.HttpClient.With<E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): Client.HttpClient.With<E1 | Exclude<E, { _tag: K }>, R1 | R> => transformResponse(self, Effect.catchTag(tag, f))
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
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<
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
    self: Client.HttpClient.With<E, R>,
    cases: Cases
  ): Client.HttpClient.With<
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
    self: Client.HttpClient.With<E, R>,
    cases: Cases
  ): Client.HttpClient.With<
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
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E2, R | R2>
  <E, R, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient.With<E2, R | R2>
} = dual(
  2,
  <E, R, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient.With<E2, R | R2> => transformResponse(self, Effect.catchAll(f))
)

/** @internal */
export const filterOrElse: {
  <E2, R2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): <E, R>(
    self: Client.HttpClient.With<E, R>
  ) => Client.HttpClient.With<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): Client.HttpClient.With<E2 | E, R2 | R>
} = dual(3, (self, f, orElse) => transformResponse(self, Effect.filterOrElse(f, orElse)))

/** @internal */
export const filterOrFail: {
  <E2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E2 | E, R>
  <E, R, E2>(
    self: Client.HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): Client.HttpClient.With<E2 | E, R>
} = dual(3, (self, f, orFailWith) => transformResponse(self, Effect.filterOrFail(f, orFailWith)))

/** @internal */
export const mapRequest = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient.With<E, R>
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
    self: Client.HttpClient.With<E, R>
  ) => Client.HttpClient.With<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient.With<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.flatMap(client.preprocess(request), f))
})

/** @internal */
export const mapRequestInput = dual<
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ) => Client.HttpClient.With<E, R>
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
    self: Client.HttpClient.With<E, R>
  ) => Client.HttpClient.With<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (
      a: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Client.HttpClient.With<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.flatMap(f(request), client.preprocess))
})

/** @internal */
export const retry: {
  <E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
    options: O
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.Retry.Return<R, E, O>
  <B, E, R1>(
    policy: Schedule.Schedule<B, NoInfer<E>, R1>
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R1 | R>
  <E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
    self: Client.HttpClient.With<E, R>,
    options: O
  ): Client.Retry.Return<R, E, O>
  <E, R, B, R1>(
    self: Client.HttpClient.With<E, R>,
    policy: Schedule.Schedule<B, E, R1>
  ): Client.HttpClient.With<E, R1 | R>
} = dual(
  2,
  <E extends E0, E0, R, R1, B>(
    self: Client.HttpClient.With<E, R>,
    policy: Schedule.Schedule<B, E0, R1>
  ): Client.HttpClient.With<E, R | R1> => transformResponse(self, Effect.retry(policy))
)

/** @internal */
export const retryTransient: {
  <
    B,
    E,
    R1 = never,
    const Mode extends "errors-only" | "response-only" | "both" = never,
    Input = "errors-only" extends Mode ? E
      : "response-only" extends Mode ? ClientResponse.HttpClientResponse
      : ClientResponse.HttpClientResponse | E
  >(
    options: {
      readonly mode?: Mode | undefined
      readonly while?: Predicate.Predicate<NoInfer<Input>>
      readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<Input>, R1>
  ): <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R1 | R>
  <
    E,
    R,
    B,
    R1 = never,
    const Mode extends "errors-only" | "response-only" | "both" = never,
    Input = "errors-only" extends Mode ? E
      : "response-only" extends Mode ? ClientResponse.HttpClientResponse
      : ClientResponse.HttpClientResponse | E
  >(
    self: Client.HttpClient.With<E, R>,
    options: {
      readonly mode?: Mode | undefined
      readonly while?: Predicate.Predicate<NoInfer<Input>>
      readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<Input>, R1>
  ): Client.HttpClient.With<E, R1 | R>
} = dual(
  2,
  <E extends E0, E0, R, B, R1 = never>(
    self: Client.HttpClient.With<E, R>,
    options: {
      readonly mode?: "errors-only" | "response-only" | "both" | undefined
      readonly while?: Predicate.Predicate<ClientResponse.HttpClientResponse | NoInfer<E>>
      readonly schedule?: Schedule.Schedule<B, ClientResponse.HttpClientResponse | NoInfer<E>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, ClientResponse.HttpClientResponse | NoInfer<E>, R1>
  ): Client.HttpClient.With<E, R | R1> => {
    const isOnlySchedule = Schedule.ScheduleTypeId in options
    const mode = isOnlySchedule ? "both" : options.mode ?? "both"
    const schedule = isOnlySchedule ? options : options.schedule
    const passthroughSchedule = schedule && Schedule.passthrough(schedule)
    const times = isOnlySchedule ? undefined : options.times
    return transformResponse(
      self,
      flow(
        mode === "errors-only" ? identity : Effect.repeat({
          schedule: passthroughSchedule,
          times,
          while: isOnlySchedule || options.while === undefined
            ? isTransientResponse
            : Predicate.and(isTransientResponse, options.while)
        }),
        mode === "response-only" ? identity : Effect.retry({
          while: isOnlySchedule || options.while === undefined
            ? isTransientError
            : Predicate.or(isTransientError, options.while),
          schedule,
          times
        })
      )
    )
  }
)

const isTransientError = (error: unknown) =>
  Predicate.hasProperty(error, Cause.TimeoutExceptionTypeId) || isTransientHttpError(error)

const isTransientHttpError = (error: unknown) =>
  Error.isHttpClientError(error) &&
  ((error._tag === "RequestError" && error.reason === "Transport") ||
    (error._tag === "ResponseError" && isTransientResponse(error.response)))

const isTransientResponse = (response: ClientResponse.HttpClientResponse) => response.status >= 429

/** @internal */
export const tap = dual<
  <_, E2, R2>(
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E | E2, R | R2>,
  <E, R, _, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient.With<E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tap(f)))

/** @internal */
export const tapError = dual<
  <_, E, E2, R2>(
    f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>
  ) => <R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E | E2, R | R2>,
  <E, R, _, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient.With<E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tapError(f)))

/** @internal */
export const tapRequest = dual<
  <_, E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => <E, R>(
    self: Client.HttpClient.With<E, R>
  ) => Client.HttpClient.With<E | E2, R | R2>,
  <E, R, _, E2, R2>(
    self: Client.HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ) => Client.HttpClient.With<E | E2, R | R2>
>(2, (self, f) => {
  const client = self as HttpClientImpl<any, any>
  return makeWith(client.postprocess as any, (request) => Effect.tap(client.preprocess(request), f))
})

/** @internal */
export const withCookiesRef = dual<
  (
    ref: Ref.Ref<Cookies.Cookies>
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ) => Client.HttpClient.With<E, R>
>(
  2,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    ref: Ref.Ref<Cookies.Cookies>
  ): Client.HttpClient.With<E, R> => {
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
  ) => <E, R>(self: Client.HttpClient.With<E, R>) => Client.HttpClient.With<E, R>,
  <E, R>(
    self: Client.HttpClient.With<E, R>,
    maxRedirects?: number | undefined
  ) => Client.HttpClient.With<E, R>
>((args) => isClient(args[0]), <E, R>(
  self: Client.HttpClient.With<E, R>,
  maxRedirects?: number | undefined
): Client.HttpClient.With<E, R> => {
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
                  new URL(response.headers.location, response.request.url)
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
          Effect.mapInputContext((input: Context.Context<never>) => Context.merge(context, input))
        )))
  )
