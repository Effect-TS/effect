/**
 * The connection to one Engine, which every service of `effect/docker` is
 * built over.
 *
 * A `DockerEngine` carries the `DockerConfig` it was built from, the
 * `HttpClient` every request goes through (upgraded ones for exec and attach
 * included), and the negotiated API version. Every service of
 * `effect/docker` (`DockerSystem`, ...) is built over it, and reads the
 * configuration from it, never from context. Registry credentials are
 * `DockerRegistryAuth`'s, not the engine's.
 *
 * Provide it with `NodeDocker` from `@effect/platform-node`: its
 * `layerFromEnv` configures it as the Docker CLI does, and its `layer` builds
 * over the `DockerConfig` you provide. Both build the `DockerEngine` over
 * Node's `HttpClient`, and provide every service with `Docker.layer`. With an
 * `HttpClient` of your own, build it with {@link make} and add the services
 * with `Docker.layer` and a `DockerRegistryAuth`.
 *
 * **API versions**
 *
 * The client speaks API 1.44 up to 1.56, the version its Schemas are
 * generated from. The first request negotiates, as moby's own client does: it
 * calls the unversioned `/_ping` (`HEAD`, falling back to `GET`), uses
 * `min(1.56, Api-Version)` (1.44 when the Engine sends no `Api-Version`),
 * caches the result for the layer's lifetime, and prefixes every request
 * with `/v{version}`. An Engine that can't serve 1.44 fails with
 * `UnsupportedApiVersion`. A failed negotiation isn't cached. Building the
 * layer never contacts the Engine.
 *
 * Pinning a version (`DockerConfig`'s `apiVersion`, or `DOCKER_API_VERSION`)
 * turns negotiation off, and the pin is used as-is. `DockerConfig`'s layers
 * check that it is `major.minor` and at least 1.44.
 *
 * **Example** (Building an engine over an `HttpClient` of your own)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { DockerConfig, DockerEngine } from "effect/docker"
 * import { HttpClient } from "effect/http"
 *
 * // the `HttpClient` in context must reach the Engine at the configured Endpoint
 * const EngineLive = Layer.effect(
 *   DockerEngine.DockerEngine,
 *   Effect.gen(function*() {
 *     return yield* DockerEngine.make(yield* HttpClient.HttpClient)
 *   })
 * ).pipe(
 *   Layer.provide(DockerConfig.layer({ endpoint: { _tag: "Tcp", host: "docker.example.com", port: 2375 } }))
 * )
 *
 * const program = Effect.gen(function*() {
 *   const engine = yield* DockerEngine.DockerEngine
 *   return yield* engine.apiVersion
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as HttpApi from "../http-api/HttpApi.ts"
import * as HttpApiClient from "../http-api/HttpApiClient.ts"
import type * as HttpApiEndpoint from "../http-api/HttpApiEndpoint.ts"
import type * as HttpApiGroup from "../http-api/HttpApiGroup.ts"
import * as HttpApiSchema from "../http-api/HttpApiSchema.ts"
import * as Headers from "../http/Headers.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as UrlParams from "../http/UrlParams.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Stream from "../Stream.ts"
import {
  ApiVersions,
  errorMessage,
  type ErrorResponse,
  ErrorResponses,
  type SwarmErrorResponse,
  SwarmErrorResponses,
  System
} from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import {
  ConnectionFailed,
  DockerError,
  InvalidResponse,
  isDockerError,
  OptionNotSupported,
  UnexpectedStatus,
  UnsupportedApiVersion
} from "./DockerError.ts"

/**
 * The connection to one Engine.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerEngine extends Context.Service<DockerEngine, {
  /** The resolved configuration the engine was built from; it never changes. */
  readonly config: DockerConfig.ResolvedConfig
  /**
   * The Engine's `HttpClient`: requests take an unversioned path such as
   * `/containers/json`. It adds the base URL, the negotiated `/v{version}`
   * prefix (negotiating on first use) and the config's `httpHeaders`. It
   * fails with `DockerError` only for `ConnectionFailed` and a failed
   * negotiation: a response is returned whatever its status.
   */
  readonly client: HttpClient.HttpClient.With<DockerError>
  /** The negotiated (or pinned) API version. Negotiates on first use. */
  readonly apiVersion: Effect.Effect<string, DockerError>
}>()("effect/docker/DockerEngine") {}

/**
 * The Engine's maximum API version from the unversioned `/_ping`, through
 * `DockerApi.System`: `HEAD` first, then `GET` if that fails for any reason
 * but the connection. As in moby's client, a connection failure doesn't dial
 * again.
 */
const pingApiVersion = (
  config: DockerConfig.ResolvedConfig,
  httpClient: HttpClient.HttpClient
): Effect.Effect<Effect.Effect<string | undefined, DockerError>> =>
  Effect.map(
    apiClient(
      DockerEngine.of({
        config,
        client: makeClient(config, httpClient),
        // a version gate needs the negotiated version, and no endpoint of `/_ping` has one
        apiVersion: Effect.die(new Error("The unversioned client has no API version"))
      }),
      System,
      "docker.Engine"
    ),
    (system) =>
      system.pingHead().pipe(
        Effect.catchIf((error) => error.reason._tag !== "ConnectionFailed", () => system.ping()),
        Effect.map((ping) => ping.apiVersion)
      )
  )

/**
 * Computes the negotiated version from what the Engine reports: the lower of
 * our maximum and the Engine's version. An Engine that reports no version gets
 * the minimum, 1.44, rather than an assumed maximum.
 */
const negotiate = (engineVersion: string | undefined): Effect.Effect<string, DockerError> => {
  if (engineVersion === undefined) return Effect.succeed(DockerConfig.minimumApiVersion)
  if (
    DockerConfig.parseApiVersion(engineVersion) === undefined ||
    DockerConfig.compareApiVersions(engineVersion, DockerConfig.minimumApiVersion) < 0
  ) {
    return Effect.fail(
      new DockerError({
        reason: new UnsupportedApiVersion({ engineVersion, minimum: DockerConfig.minimumApiVersion })
      })
    )
  }
  return Effect.succeed(
    DockerConfig.compareApiVersions(engineVersion, DockerConfig.maximumApiVersion) < 0
      ? engineVersion
      : DockerConfig.maximumApiVersion
  )
}

/** Runs `effect` once successfully; failures are not cached, as in moby's client. */
const onceSuccessful = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> => {
  let result: Option.Option<A> = Option.none()
  const semaphore = Semaphore.makeUnsafe(1)
  const run = semaphore.withPermits(1)(Effect.suspend(() =>
    Option.isSome(result)
      ? Effect.succeed(result.value)
      : Effect.map(effect, (value) => {
        result = Option.some(value)
        return value
      })
  ))
  return Effect.suspend(() => Option.isSome(result) ? Effect.succeed(result.value) : run)
}

/**
 * Builds a `DockerEngine` over the `DockerConfig` in context and an
 * `HttpClient` that reaches its Endpoint.
 *
 * **Details**
 *
 * The `HttpClient` receives absolute URLs (`http://localhost/...` for a unix
 * socket, `http(s)://host:port/...` for TCP) and must route them to the
 * Endpoint. It must not impose timeouts of its own, and must support HTTP/1.1
 * upgrades for exec and attach.
 *
 * Nothing contacts the Engine until the first request. With the config's
 * `apiVersion` set, negotiation is off and the version is used as-is:
 * `DockerConfig`'s layers have checked it. To fail fast when the Engine is
 * unreachable, ping it while building your application's layer, with a
 * timeout of your choice.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = (
  httpClient: HttpClient.HttpClient
): Effect.Effect<DockerEngine["Service"], never, DockerConfig.DockerConfig> =>
  Effect.gen(function*() {
    const config = yield* DockerConfig.DockerConfig
    const apiVersion = config.apiVersion !== undefined
      ? Effect.succeed(config.apiVersion)
      : onceSuccessful(Effect.flatMap(yield* pingApiVersion(config, httpClient), negotiate))
    return DockerEngine.of({
      config,
      client: makeClient(config, httpClient, apiVersion),
      apiVersion
    })
  })

// -----------------------------------------------------------------------------
// requests
// -----------------------------------------------------------------------------

/** The base URL that transports receive: the host only matters for TCP. */
const baseUrl = (endpoint: typeof DockerConfig.Endpoint.Type): string =>
  endpoint._tag === "Unix"
    ? "http://localhost"
    : `${endpoint.tls !== undefined ? "https" : "http"}://${DockerConfig.hostAndPort(endpoint)}`

/** The first `code` in an error's cause chain, as Node's errors carry them. */
const errorCode = (u: unknown): string | undefined => {
  for (let i = 0; i < 8 && typeof u === "object" && u !== null; i++) {
    const record = u as { readonly code?: unknown; readonly cause?: unknown }
    if (typeof record.code === "string") return record.code
    u = record.cause
  }
  return undefined
}

/**
 * A best-effort hint for a connection failure, from the Node error code, as
 * moby gives one, and whether it names a misconfiguration that a retry can't
 * fix.
 */
const connectionHint = (
  cause: unknown,
  endpoint: typeof DockerConfig.Endpoint.Type
): { readonly hint?: string | undefined; readonly permanent: boolean } => {
  const code = errorCode(cause)
  if (code === undefined) return { permanent: false }
  switch (code) {
    case "ENOENT":
      return endpoint._tag === "Unix"
        ? { hint: `the socket ${endpoint.path} doesn't exist: is the Engine running?`, permanent: false }
        : { permanent: false }
    case "EACCES":
    case "EPERM":
      return endpoint._tag === "Unix"
        ? { hint: `permission denied on ${endpoint.path}: is the user allowed to use the Engine?`, permanent: true }
        : { hint: "permission denied", permanent: true }
    case "ECONNREFUSED":
      return { hint: "connection refused: is the Engine running and listening there?", permanent: false }
    case "EPROTO":
    case "ERR_SSL_WRONG_VERSION_NUMBER":
    case "ERR_SSL_PACKET_LENGTH_TOO_LONG":
      return { hint: "TLS/plain mismatch: the Engine and the client disagree about TLS", permanent: true }
  }
  if (code.includes("CERTIFICATE_REQUIRED")) {
    return { hint: "the Engine requires a client certificate", permanent: true }
  }
  if (
    code.startsWith("CERT_") || code.startsWith("ERR_TLS_CERT") || code.includes("SELF_SIGNED") ||
    code.startsWith("UNABLE_TO_")
  ) {
    return { hint: "the Engine's TLS certificate couldn't be verified", permanent: true }
  }
  return { permanent: false }
}

/**
 * An `HttpClientError` safe to keep as a cause: its request is reduced to the
 * method and path, because the query can hold build args, the headers
 * registry credentials, and the body passwords or container env. Errors that
 * hold a response (whose request has everything) become a `TransportError`
 * with the same message. `HttpClientError`'s own serialization isn't enough:
 * it redacts only the query names known where it is serialized, and the full
 * request stays a property.
 */
const sanitizeCause = (cause: unknown): unknown => {
  if (!HttpClientError.isHttpClientError(cause)) return cause
  const reason = cause.reason
  const fields = {
    request: HttpClientRequest.make(reason.request.method)(reason.request.url),
    ...(reason.cause !== undefined ? { cause: reason.cause } : {}),
    ...(reason.description !== undefined ? { description: reason.description } : {})
  }
  switch (reason._tag) {
    case "TransportError":
      return new HttpClientError.HttpClientError({ reason: new HttpClientError.TransportError(fields) })
    case "EncodeError":
      return new HttpClientError.HttpClientError({ reason: new HttpClientError.EncodeError(fields) })
    case "InvalidUrlError":
      return new HttpClientError.HttpClientError({ reason: new HttpClientError.InvalidUrlError(fields) })
    default:
      return new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({
          ...fields,
          description: `${reason._tag}: ${reason.description ?? "response failed"}`
        })
      })
  }
}

/**
 * Wraps a transport failure as `ConnectionFailed`.
 *
 * @internal
 */
export const connectionFailed = (endpoint: typeof DockerConfig.Endpoint.Type, cause: unknown): DockerError =>
  new DockerError({
    reason: new ConnectionFailed({
      cause: sanitizeCause(cause),
      target: DockerConfig.formatHost(endpoint),
      ...connectionHint(cause, endpoint)
    })
  })

const isErrorResponse = Schema.is(Schema.Union([...ErrorResponses, ...SwarmErrorResponses]))

/** The decoders of `DockerApi`'s error responses, by status. */
const errorResponses = new Map(
  ErrorResponses.map((schema) => [HttpApiSchema.getStatusErrorSchema(schema), Schema.decodeSync(schema)] as const)
)

/** A response of `operation` that isn't a success, as `DockerApi` declares its status, else `UnexpectedStatus`. */
const statusError = (status: number, body: string, operation: string): DockerError => {
  const decode = errorResponses.get(status)
  return new DockerError({
    reason: decode === undefined ? new UnexpectedStatus({ status, message: errorMessage(body) }) : decode(body),
    operation
  })
}

/** How much of an error response's body is read. */
const maxErrorBody = 1024 * 1024

/** The text of an error response, read up to {@link maxErrorBody}; a body that fails to read is empty. */
const errorBodyText = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<string> =>
  Effect.suspend(() => {
    const chunks: Array<Uint8Array> = []
    let size = 0
    return response.stream.pipe(
      Stream.takeUntil((chunk) => {
        chunks.push(chunk)
        size += chunk.length
        return size >= maxErrorBody
      }),
      Stream.runDrain,
      Effect.ignore,
      Effect.map(() => {
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
        return new TextDecoder().decode(bytes.subarray(0, maxErrorBody))
      })
    )
  })

/**
 * Fails a response of `operation` that isn't a success, as `apiClient` does
 * for a status `DockerApi` doesn't declare and for a request that asks for the
 * response alone.
 *
 * @internal
 */
export const filterStatus = (operation: string) =>
(
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<HttpClientResponse.HttpClientResponse, DockerError> =>
  response.status < 400
    ? Effect.succeed(response)
    : Effect.flatMap(errorBodyText(response), (body) => Effect.fail(statusError(response.status, body, operation)))

/**
 * The negotiated version (negotiating on first use), recorded on the current
 * span as `docker.api_version`.
 */
const negotiatedVersion = (apiVersion: Effect.Effect<string, DockerError>): Effect.Effect<string, DockerError> =>
  Effect.tap(apiVersion, (negotiated) => Effect.annotateCurrentSpan("docker.api_version", negotiated))

/**
 * The configured headers a request doesn't set itself.
 */
const defaultHeaders = (
  headers: Readonly<Record<string, string>>,
  present: ReadonlyArray<string>
): Record<string, string> => {
  const set = new Set(present.map((name) => name.toLowerCase()))
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !set.has(name.toLowerCase())))
}

/** The headers that carry registry credentials. */
const redactedHeaders = ["X-Registry-Auth", "X-Registry-Config"]

/**
 * The query parameters that can carry secrets: Dockerfile instructions such as
 * `ENV TOKEN=…`, import sources and remote build contexts (presigned URLs, or
 * `user:pass@`), and build args.
 */
const redactedUrlParams = ["changes", "fromSrc", "remote", "buildargs"]

/** Runs a request with the registry headers and secret query parameters redacted in spans. */
const withRedactedNames = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.flatMap(
    Effect.all([Effect.service(Headers.CurrentRedactedNames), Effect.service(UrlParams.CurrentRedactedNames)]),
    ([headers, urlParams]) =>
      effect.pipe(
        Effect.provideService(Headers.CurrentRedactedNames, [...headers, ...redactedHeaders]),
        Effect.provideService(UrlParams.CurrentRedactedNames, [...urlParams, ...redactedUrlParams])
      )
  )

/**
 * The Engine's `HttpClient`: the runtime's client with the negotiated
 * `/v{version}` prefix (when `apiVersion` is given; `/_ping` has none), the
 * Endpoint's base URL, the configured headers, registry headers and secret
 * query parameters redacted, and transport failures as `ConnectionFailed`.
 * Statuses are left to `DockerApi`'s error responses, or {@link filterStatus}.
 */
const makeClient = (
  config: DockerConfig.ResolvedConfig,
  httpClient: HttpClient.HttpClient,
  apiVersion?: Effect.Effect<string, DockerError> | undefined
): HttpClient.HttpClient.With<DockerError> => {
  const { endpoint } = config
  // mapRequest steps run in order: the version prefix goes on before the base URL
  const prefixed = HttpClient.mapRequestEffect(
    httpClient,
    (request) =>
      apiVersion === undefined ? Effect.succeed(request) : Effect.map(
        negotiatedVersion(apiVersion),
        (negotiated) => HttpClientRequest.prependUrl(request, `/v${negotiated}`)
      )
  )
  return prefixed.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl(endpoint))),
    // the configured headers, unless the request sets them, as moby's client does
    HttpClient.mapRequest((request) =>
      HttpClientRequest.setHeaders(
        request,
        defaultHeaders(config.httpHeaders, [
          ...Object.keys(request.headers),
          // a body's content type counts as set
          ...("contentType" in request.body && request.body.contentType !== undefined ? ["Content-Type"] : [])
        ])
      )
    ),
    // a request body stream that fails with a `DockerError` (the caller's input) keeps it
    HttpClient.transform(withRedactedNames),
    HttpClient.catchTag("HttpClientError", (cause) =>
      Effect.fail(
        cause.reason._tag === "EncodeError" && isDockerError(cause.reason.cause)
          ? cause.reason.cause
          : connectionFailed(endpoint, cause)
      ))
  )
}

/**
 * The failures of an `HttpApiClient` method: the Engine's client already
 * fails with `DockerError`, and a declared error response is decoded.
 *
 * @internal
 */
export type MethodError =
  | DockerError
  | HttpClientError.HttpClientError
  | Schema.SchemaError
  | ErrorResponse
  | SwarmErrorResponse

/** `HttpApiClient`'s failure for a response whose status no endpoint schema declares. */
type UnexpectedStatusError = HttpClientError.HttpClientError & {
  readonly reason: HttpClientError.DecodeError & { readonly response: HttpClientResponse.HttpClientResponse }
}

const isUnexpectedStatus = (error: MethodError): error is UnexpectedStatusError =>
  HttpClientError.isHttpClientError(error) && error.reason._tag === "DecodeError" &&
  error.reason.response !== undefined && error.reason.cause === undefined

/**
 * Maps a method's failures to `DockerError` naming the operation: an error
 * response as its reason, a body that fails to read as `ConnectionFailed`,
 * and one that fails to decode as `InvalidResponse`. A `DockerError` keeps
 * the operation it already names.
 *
 * @internal
 */
export const toDockerError =
  (engine: DockerEngine["Service"], operation: string) => (error: MethodError): DockerError =>
    isDockerError(error)
      ? error.operation === undefined ? new DockerError({ reason: error.reason, operation }) : error
      : isErrorResponse(error)
      ? new DockerError({ reason: error, operation })
      : isUnexpectedStatus(error)
      ? new DockerError({
        reason: new InvalidResponse({ issue: `unexpected status ${error.reason.response.status}`, cause: error }),
        operation
      })
      : HttpClientError.isHttpClientError(error) && error.reason._tag !== "DecodeError"
      ? new DockerError({ reason: connectionFailed(engine.config.endpoint, error).reason, operation })
      : new DockerError({
        reason: new InvalidResponse({ issue: Schema.isSchemaError(error) ? error.issue : error.message, cause: error }),
        operation
      })

/** The span options of an operation: the resource it acts on, as `docker.resource_id`. */
const spanOptions = (resource: string | undefined) =>
  resource === undefined ? undefined : { attributes: { "docker.resource_id": resource } }

/**
 * The operation that {@link withOperation} or {@link withStreamOperation} runs:
 * an endpoint of the same name called inside it runs in its span.
 */
const CurrentOperation = Context.Reference<string | undefined>("effect/docker/DockerEngine/CurrentOperation", {
  defaultValue: () => undefined
})

/**
 * Runs an effect as the operation `name`: in a span of that name, with the
 * `resource` it acts on as `docker.resource_id`, and its failures as
 * `DockerError` naming the operation. For methods that aren't one HttpApi
 * request.
 *
 * @internal
 */
export const withOperation =
  (engine: DockerEngine["Service"], name: string, resource?: string) =>
  <A, R>(self: Effect.Effect<A, MethodError, R>): Effect.Effect<A, DockerError, R> =>
    self.pipe(
      Effect.mapError(toDockerError(engine, name)),
      Effect.provideService(CurrentOperation, name),
      Effect.withSpan(name, spanOptions(resource))
    )

/**
 * Runs a stream as the operation `name`, as {@link withOperation} runs an
 * effect: its span lasts until the stream ends.
 *
 * @internal
 */
export const withStreamOperation =
  (engine: DockerEngine["Service"], name: string, resource?: string) =>
  <A, R>(self: Stream.Stream<A, MethodError, R>): Stream.Stream<A, DockerError, R> =>
    self.pipe(
      Stream.mapError(toDockerError(engine, name)),
      Stream.provideService(CurrentOperation, name),
      Stream.withSpan(name, spanOptions(resource))
    )

// -----------------------------------------------------------------------------
// API version gates
// -----------------------------------------------------------------------------

/**
 * Whether a Swarm update failed because the object changed since it was
 * read: swarmkit's `update out of sequence`, which the Engine answers with
 * 500.
 *
 * @internal
 */
export const isOutOfSequence = (error: DockerError): boolean =>
  error.reason._tag === "ServerError" && error.reason.message.includes("update out of sequence")

/**
 * A Swarm object's read-modify-write: inspects the object, writes `f` of its
 * spec at the version read, and starts over from the inspect while the write
 * fails out of sequence, at most 5 times in all. A missing spec is empty, and
 * a missing version 0.
 *
 * @internal
 */
export const modifyWith = <S extends object, A>(
  inspect: Effect.Effect<
    { readonly Spec?: S | undefined; readonly Version?: { readonly Index?: number | undefined } | undefined },
    DockerError
  >,
  write: (spec: S, version: number) => Effect.Effect<A, DockerError>,
  f: (spec: S) => S
): Effect.Effect<A, DockerError> =>
  Effect.flatMap(inspect, (object) =>
    // every Swarm object's spec has only optional fields
    write(f(object.Spec ?? ({} as S)), object.Version?.Index ?? 0)).pipe(
      Effect.retry({ while: isOutOfSequence, times: 4 })
    )

/** A request field the caller set, and the API version it arrived in. */
interface Gate {
  readonly option: string
  readonly since: string
}

/** Whether `value` has a value at `path`; a `*` key matches any element or entry. */
const isSetAt = (value: unknown, path: ReadonlyArray<string>): boolean => {
  if (path.length === 0) return value !== undefined
  if (typeof value !== "object" || value === null) return false
  const [key, ...rest] = path
  return key === "*"
    ? Object.values(value).some((child) => isSetAt(child, rest))
    : isSetAt((value as Record<string, unknown>)[key], rest)
}

/** The gates of {@link ApiVersions} that apply to `request`: the endpoint's, and the fields it sets. */
const gatesOf = (
  versions: ApiVersions["Service"] | undefined,
  operation: string,
  request: unknown
): ReadonlyArray<Gate> => {
  if (versions === undefined) return []
  const gates: Array<Gate> = versions.endpoint === undefined ? [] : [{ option: operation, since: versions.endpoint }]
  for (const part of ["query", "payload"] as const) {
    for (const [option, since] of Object.entries(versions[part] ?? {})) {
      if (isSetAt(request, [part, ...option.split(".")])) gates.push({ option, since })
    }
  }
  return gates
}

/** Fails with `OptionNotSupported` for the first gate newer than the negotiated version. */
const checkGates = (negotiated: string, gates: ReadonlyArray<Gate>): Effect.Effect<void, DockerError> => {
  for (const gate of gates) {
    if (DockerConfig.compareApiVersions(negotiated, gate.since) < 0) {
      return Effect.fail(
        new DockerError({
          reason: new OptionNotSupported({
            option: gate.option,
            requiredVersion: gate.since,
            negotiatedVersion: negotiated
          })
        })
      )
    }
  }
  return Effect.void
}

// -----------------------------------------------------------------------------
// HttpApi
// -----------------------------------------------------------------------------

/** What {@link apiClient} reads of a request: the resource in its path, and its response mode. */
interface ClientRequest {
  readonly params?: { readonly id?: string; readonly name?: string } | undefined
  readonly responseMode?: HttpApiClient.Client.ResponseMode | undefined
}

type Success<Endpoint extends HttpApiEndpoint.ConstraintRequest> = HttpApiClient.SuccessType<Endpoint["~Success"]>

type DockerValue<A> = A extends Stream.Stream<infer X, infer _E, infer R> ? Stream.Stream<X, DockerError, R>
  : A extends HttpApiSchema.withHeaders<Stream.Stream<infer X, infer _E, infer R>, infer H>
    ? HttpApiSchema.withHeaders<Stream.Stream<X, DockerError, R>, H>
  : A

/**
 * The client method of an endpoint, as {@link apiClient} makes it: failing
 * only with `DockerError`. A streamed success is the `Stream` itself.
 *
 * @internal
 */
export type ApiMethod<Endpoint extends HttpApiEndpoint.ConstraintRequest> = <
  Mode extends HttpApiClient.Client.ResponseMode = "decoded-only"
>(
  request: HttpApiEndpoint.ClientRequest<
    Endpoint["~Params"],
    Endpoint["~Query"],
    Endpoint["~Payload"],
    Endpoint["~Headers"],
    Mode
  >
) => [Mode, Success<Endpoint>] extends ["decoded-only", Stream.Stream<infer A, infer _E, infer R>] ?
  Stream.Stream<A, DockerError, R>
  : Effect.Effect<HttpApiClient.Client.Response<DockerValue<Success<Endpoint>>, Mode>, DockerError>

/**
 * The client of an endpoint group, as {@link apiClient} makes it.
 *
 * @internal
 */
export type ApiClient<Group extends HttpApiGroup.Constraint> = Group["endpoints"] extends
  infer Endpoints extends Readonly<Record<string, HttpApiEndpoint.ConstraintRequest>> ?
  { readonly [Id in keyof Endpoints]: ApiMethod<Endpoints[Id]> }
  : {}

/**
 * The client of an endpoint group over the engine's `HttpClient`. Each method
 * checks the endpoint's {@link ApiVersions}, runs in a span named
 * `<operations>.<endpoint>` (e.g. `docker.System.info`) with the `id` or
 * `name` path parameter as `docker.resource_id`, and fails only with
 * `DockerError`, naming that operation. A streamed success is returned as the
 * `Stream`, whose span lasts until it ends, and its failures are mapped too,
 * also for a stream with headers. Called inside the {@link withOperation} of
 * the same name, such as a method that resolves credentials first, a method
 * runs in that operation's span.
 *
 * @internal
 */
export const apiClient = <Group extends HttpApiGroup.Constraint>(
  engine: DockerEngine["Service"],
  group: Group,
  operations: string
): Effect.Effect<ApiClient<Group>, never, HttpApiGroup.MiddlewareClient<Group>> =>
  Effect.map(
    HttpApiClient.group(HttpApi.make("docker").add(group), {
      group: group.identifier as HttpApiGroup.Identifier<Group>,
      httpClient: engine.client
    }) as unknown as Effect.Effect<
      Readonly<Record<string, (request: unknown) => Effect.Effect<unknown, MethodError>>>,
      never,
      HttpApiGroup.MiddlewareClient<Group>
    >,
    (client) =>
      Object.fromEntries(
        Object.entries(group.endpoints as Readonly<Record<string, HttpApiEndpoint.Top>>).map(([id, endpoint]) => {
          const method = client[id]
          const name = `${operations}.${id}`
          const mapError = toDockerError(engine, name)
          const versions = Context.getOrUndefined(endpoint.annotations, ApiVersions)
          const streamed = Array.from(endpoint.success).some(HttpApiSchema.isStreamSchema)
          // an error status `DockerApi` doesn't declare, with the message of its body
          const send = (request: ClientRequest | undefined) =>
            Effect.catchIf(
              method(request),
              (error) => isUnexpectedStatus(error) && error.reason.response.status >= 400,
              (error) => filterStatus(name)((error as UnexpectedStatusError).reason.response)
            )
          return [id, (request: ClientRequest | undefined) => {
            const gates = gatesOf(versions, name, request)
            const response = (gates.length === 0 ? send(request) : Effect.andThen(
              Effect.flatMap(engine.apiVersion, (negotiated) => checkGates(negotiated, gates)),
              send(request)
            )).pipe(
              Effect.map((value) =>
                Stream.isStream(value)
                  ? Stream.mapError(value as Stream.Stream<unknown, MethodError>, mapError)
                  : HttpApiSchema.isWithHeadersValue(value) && Stream.isStream(value.body)
                  ? { ...value, body: Stream.mapError(value.body as Stream.Stream<unknown, MethodError>, mapError) }
                  : value
              ),
              Effect.mapError(mapError)
            )
            const options = spanOptions(request?.params?.id ?? request?.params?.name)
            // a decoded stream's span lasts until the stream ends
            return streamed && (request?.responseMode === undefined || request.responseMode === "decoded-only")
              ? Stream.unwrap(Effect.map(Effect.service(CurrentOperation), (current) => {
                const stream = Stream.unwrap(
                  response as Effect.Effect<Stream.Stream<unknown, DockerError>, DockerError>
                )
                return current === name ? stream : Stream.withSpan(stream, name, options)
              }))
              : Effect.flatMap(
                Effect.service(CurrentOperation),
                (current) => current === name ? response : Effect.withSpan(response, name, options)
              )
          }]
        })
      ) as ApiClient<Group>
  )
