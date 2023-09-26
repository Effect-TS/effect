import * as Context from "@effect/data/Context"
import { dual, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import { pipeArguments } from "@effect/data/Pipeable"
import type * as Predicate from "@effect/data/Predicate"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type * as Body from "@effect/platform/Http/Body"
import type * as Client from "@effect/platform/Http/Client"
import type * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as Method from "@effect/platform/Http/Method"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import * as internalBody from "@effect/platform/internal/http/body"
import * as internalError from "@effect/platform/internal/http/clientError"
import * as internalRequest from "@effect/platform/internal/http/clientRequest"
import * as internalResponse from "@effect/platform/internal/http/clientResponse"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Stream from "@effect/stream/Stream"

/** @internal */
export const TypeId: Client.TypeId = Symbol.for("@effect/platform/Http/Client") as Client.TypeId

/** @internal */
export const tag = Context.Tag<Client.Client.Default>(TypeId)

const clientProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const make = <R, E, A>(
  f: (request: ClientRequest.ClientRequest) => Effect.Effect<R, E, A>
) => {
  Object.setPrototypeOf(f, clientProto)
  return f as Client.Client<R, E, A>
}

/** @internal */
export const fetch = (
  options: RequestInit = {}
): Client.Client.Default =>
  make((request) =>
    Effect.flatMap(
      UrlParams.makeUrl(request.url, request.urlParams, (_) =>
        internalError.requestError({
          request,
          reason: "InvalidUrl",
          error: _
        })),
      (url) =>
        Effect.suspend(() => {
          const headers = new Headers(request.headers)
          const send = (body: BodyInit | undefined) =>
            Effect.map(
              Effect.tryPromise({
                try: (signal) =>
                  globalThis.fetch(url, {
                    ...options,
                    method: request.method,
                    headers,
                    body,
                    signal
                  }),
                catch: (_) =>
                  internalError.requestError({
                    request,
                    reason: "Transport",
                    error: _
                  })
              }),
              (_) => internalResponse.fromWeb(request, _)
            )
          if (Method.hasBody(request.method)) {
            return send(convertBody(request.body))
          }
          return send(undefined)
        })
    )
  )

const convertBody = (body: Body.Body): BodyInit | undefined => {
  switch (body._tag) {
    case "Empty":
      return undefined
    case "Raw":
      return body.body as any
    case "Uint8Array":
      return body.body
    case "FormData":
      return body.formData
    case "Stream":
      return Stream.toReadableStream(body.stream)
  }
}

/** @internal */
export const fetchOk = (
  options: RequestInit = {}
): Client.Client.Default => filterStatusOk(fetch(options))

/** @internal */
export const layer = Layer.succeed(tag, fetch())

/** @internal */
export const transform = dual<
  <R, E, A, R1, E1, A1>(
    f: (client: Client.Client<R, E, A>) => (request: ClientRequest.ClientRequest) => Effect.Effect<R1, E1, A1>
  ) => (self: Client.Client<R, E, A>) => Client.Client<R1, E1, A1>,
  <R, E, A, R1, E1, A1>(
    self: Client.Client<R, E, A>,
    f: (client: Client.Client<R, E, A>) => (request: ClientRequest.ClientRequest) => Effect.Effect<R1, E1, A1>
  ) => Client.Client<R1, E1, A1>
>(2, (self, f) => make(f(self)))

/** @internal */
export const transformResponse = dual<
  <R, E, A, R1, E1, A1>(
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R1, E1, A1>
  ) => (self: Client.Client<R, E, A>) => Client.Client<R1, E1, A1>,
  <R, E, A, R1, E1, A1>(
    self: Client.Client<R, E, A>,
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R1, E1, A1>
  ) => Client.Client<R1, E1, A1>
>(2, (self, f) => make((request) => f(self(request))))

/** @internal */
export const catchTag: {
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1, A1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ): <R, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Client.Client<R, E, A>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ): Client.Client<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
} = dual(
  3,
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Client.Client<R, E, A>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ): Client.Client<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A> =>
    make((request) => Effect.catchTag(self(request), tag, f))
)

/** @internal */
export const catchTags: {
  <
    E,
    Cases
      extends (E extends { _tag: string }
        ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) }
        : {})
  >(
    cases: Cases
  ): <R, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer R, any, any> ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer A> ? A
        : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases
      extends (E extends { _tag: string }
        ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) }
        : {})
  >(
    self: Client.Client<R, E, A>,
    cases: Cases
  ): Client.Client<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer R, any, any> ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer A> ? A
        : never
    }[keyof Cases]
  >
} = dual(
  2,
  <
    R,
    E extends { _tag: string },
    A,
    Cases
      extends (E extends { _tag: string }
        ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) }
        : {})
  >(
    self: Client.Client<R, E, A>,
    cases: Cases
  ): Client.Client<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<infer R, any, any> ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, infer E, any> ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (
        ...args: Array<any>
      ) => Effect.Effect<any, any, infer A> ? A
        : never
    }[keyof Cases]
  > => make((request) => Effect.catchTags(self(request), cases))
)

/** @internal */
export const catchAll: {
  <E, R2, E2, A2>(f: (e: E) => Effect.Effect<R2, E2, A2>): <R, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R | R2, E2, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Client.Client<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ): Client.Client<R | R2, E2, A2 | A>
} = dual(
  2,
  <R, E, A, R2, E2, A2>(
    self: Client.Client<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ): Client.Client<R | R2, E2, A2 | A> => make((request) => Effect.catchAll(self(request), f))
)

/** @internal */
export const filterOrElse = dual<
  <A, R2, E2, B>(f: Predicate.Predicate<A>, orElse: (a: A) => Effect.Effect<R2, E2, B>) => <R, E>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R2 | R, E2 | E, A | B>,
  <R, E, A, R2, E2, B>(
    self: Client.Client<R, E, A>,
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<R2, E2, B>
  ) => Client.Client<R2 | R, E2 | E, A | B>
>(3, (self, f, orElse) => make((request) => Effect.filterOrElse(self(request), f, orElse)))

/** @internal */
export const filterOrFail = dual<
  <A, E2>(f: Predicate.Predicate<A>, orFailWith: (a: A) => E2) => <R, E>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R, E2 | E, A>,
  <R, E, A, E2>(
    self: Client.Client<R, E, A>,
    f: Predicate.Predicate<A>,
    orFailWith: (a: A) => E2
  ) => Client.Client<R, E2 | E, A>
>(3, (self, f, orFailWith) => make((request) => Effect.filterOrFail(self(request), f, orFailWith)))

/** @internal */
export const filterStatus = dual<
  (f: (status: number) => boolean) => <R, E>(
    self: Client.Client.WithResponse<R, E>
  ) => Client.Client.WithResponse<R, E | Error.ResponseError>,
  <R, E>(
    self: Client.Client.WithResponse<R, E>,
    f: (status: number) => boolean
  ) => Client.Client.WithResponse<R, E | Error.ResponseError>
>(
  2,
  (self, f) =>
    make((request) =>
      Effect.filterOrFail(
        self(request),
        (response) => f(response.status),
        (response) =>
          internalError.responseError({
            request,
            response,
            reason: "StatusCode",
            error: "non 2xx status code"
          })
      )
    )
)

/** @internal */
export const filterStatusOk: <R, E>(
  self: Client.Client.WithResponse<R, E>
) => Client.Client.WithResponse<R, E | Error.ResponseError> = filterStatus((status) => status >= 200 && status < 300)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <R, E>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R, E, B>,
  <R, E, A, B>(
    self: Client.Client<R, E, A>,
    f: (a: A) => B
  ) => Client.Client<R, E, B>
>(2, (self, f) => make((request) => Effect.map(self(request), f)))

/** @internal */
export const mapEffect = dual<
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) => <R, E>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R | R2, E | E2, B>,
  <R, E, A, R2, E2, B>(
    self: Client.Client<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, B>
  ) => Client.Client<R | R2, E | E2, B>
>(2, (self, f) => make((request) => Effect.flatMap(self(request), f)))

/** @internal */
export const mapRequest = dual<
  (f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest) => <R, E, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R, E, A>,
  <R, E, A>(
    self: Client.Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest
  ) => Client.Client<R, E, A>
>(2, (self, f) => make((request) => self(f(request))))

/** @internal */
export const mapRequestEffect = dual<
  <R2, E2>(f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>) => <R, E, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R | R2, E | E2, A>,
  <R, E, A, R2, E2>(
    self: Client.Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>
  ) => Client.Client<R | R2, E | E2, A>
>(2, (self, f) => make((request) => Effect.flatMap(f(request), self)))

/** @internal */
export const withB3Propagation = <R, E>(
  self: Client.Client.WithResponse<R, E>
): Client.Client.WithResponse<R | Scope.Scope, E> =>
  make((req) =>
    pipe(
      Effect.map(
        Effect.currentSpan,
        Option.match({
          onNone: () => req,
          onSome: (span) => {
            const parentId = span.parent._tag === "Some" ? `-${span.parent.value.spanId}` : ""
            return internalRequest.setHeader(
              req,
              "b3",
              `${span.traceId}-${span.spanId}-1${parentId}`
            )
          }
        })
      ),
      Effect.flatMap(self),
      Effect.tap((res) =>
        Effect.ignore(
          Effect.flatMap(IncomingMessage.schemaExternalSpan(res), Effect.withParentSpanScoped)
        )
      )
    )
  )

/** @internal */
export const retry: {
  <R1, E extends E0, E0, B>(policy: Schedule.Schedule<R1, E0, B>): <R, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R1 | R, E, A>
  <R, E extends E0, E0, A, R1, B>(
    self: Client.Client<R, E, A>,
    policy: Schedule.Schedule<R1, E0, B>
  ): Client.Client<R | R1, E, A>
} = dual(
  2,
  <R, E extends E0, E0, A, R1, B>(
    self: Client.Client<R, E, A>,
    policy: Schedule.Schedule<R1, E0, B>
  ): Client.Client<R | R1, E, A> => make((request) => Effect.retry(self(request), policy))
)

/** @internal */
export const schemaFunction = dual<
  <SI, SA>(
    schema: Schema.Schema<SI, SA>
  ) => <R, E, A>(
    self: Client.Client<R, E, A>
  ) => (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<R, E | ParseResult.ParseError | Error.RequestError, A>,
  <R, E, A, SI, SA>(
    self: Client.Client<R, E, A>,
    schema: Schema.Schema<SI, SA>
  ) => (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<R, E | ParseResult.ParseError | Error.RequestError, A>
>(2, (self, schema) => {
  const encode = Schema.encode(schema)
  return (request) => (a) =>
    Effect.flatMap(
      Effect.tryMap(encode(a), {
        try: (body) => new TextEncoder().encode(JSON.stringify(body)),
        catch: (error) =>
          internalError.requestError({
            request,
            reason: "Encode",
            error
          })
      }),
      (body) =>
        self(internalRequest.setBody(
          request,
          internalBody.uint8Array(body, "application/json")
        ))
    )
})

/** @internal */
export const tap = dual<
  <A, R2, E2, _>(f: (a: A) => Effect.Effect<R2, E2, _>) => <R, E>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R | R2, E | E2, A>,
  <R, E, A, R2, E2, _>(
    self: Client.Client<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => Client.Client<R | R2, E | E2, A>
>(2, (self, f) => make((request) => Effect.tap(self(request), f)))

/** @internal */
export const tapRequest = dual<
  <R2, E2, _>(f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, _>) => <R, E, A>(
    self: Client.Client<R, E, A>
  ) => Client.Client<R | R2, E | E2, A>,
  <R, E, A, R2, E2, _>(
    self: Client.Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, _>
  ) => Client.Client<R | R2, E | E2, A>
>(2, (self, f) => make((request) => Effect.zipRight(f(request), self(request))))
