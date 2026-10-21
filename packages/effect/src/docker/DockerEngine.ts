/**
 * The connection to one Engine: the single seam of `effect/docker`.
 *
 * A `DockerEngine` carries the `DockerConfig` it was built from, the
 * `HttpClient` every request goes through (upgraded ones for exec and attach
 * included), and the negotiated API version. Every service of
 * `effect/docker` (`DockerSystem`, ...) is built over it, and reads the
 * configuration from it, never from context.
 *
 * Provide it with `NodeDocker` from `@effect/platform-node`: its
 * `layerFromEnv` configures it as the Docker CLI does, and its `layer` builds
 * over the `DockerConfig` you provide. Both build the `DockerEngine` over
 * Node's `HttpClient`, and provide every service with `Docker.layer`. With an
 * `HttpClient` of your own, build it with {@link make} and add the services
 * with `Docker.layer`.
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
import * as Duration from "../Duration.ts"
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
import * as ChildProcess from "../process/ChildProcess.ts"
import * as ChildProcessSpawner from "../process/ChildProcessSpawner.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Stream from "../Stream.ts"
import {
  ApiVersions,
  type AuthConfig,
  errorMessage,
  type ErrorResponse,
  ErrorResponses,
  errorStatus
} from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import {
  BadRequest,
  Conflict,
  ConnectionFailed,
  CredentialsUnavailable,
  DockerError,
  type DockerErrorReason,
  Forbidden,
  InvalidResponse,
  isDockerError,
  NotFound,
  NotImplemented,
  OptionNotSupported,
  PreconditionFailed,
  type ResponseFields,
  ServerError,
  TooManyRequests,
  Unauthorized,
  Unavailable,
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
   * prefix (negotiating on first use) and the config's `httpHeaders`, and
   * fails with `DockerError` only for `ConnectionFailed`: a response is
   * returned whatever its status.
   */
  readonly client: HttpClient.HttpClient.With<DockerError>
  /** The negotiated (or pinned) API version. Negotiates on first use. */
  readonly apiVersion: Effect.Effect<string, DockerError>
  /**
   * Resolves the credential for a registry from the config, as the Docker CLI
   * does; `undefined` means anonymous. See {@link make}.
   */
  readonly credential: (registry: string) => Effect.Effect<DockerConfig.Credential | undefined, DockerError>
}>()("effect/docker/DockerEngine") {}

/**
 * The Engine's maximum API version from the unversioned `/_ping`: `HEAD`
 * first, then `GET` if that doesn't answer 200. As in moby's client, a
 * connection failure doesn't dial again.
 */
const pingApiVersion = (
  unversioned: HttpClient.HttpClient.With<DockerError>
): Effect.Effect<string | undefined, DockerError> =>
  unversioned.head("/_ping").pipe(
    Effect.flatMap((response) =>
      response.status === 200
        ? Effect.succeed(response)
        : Effect.flatMap(unversioned.get("/_ping"), filterStatus("docker.Engine.apiVersion"))
    ),
    Effect.tap((response) => Effect.ignore(response.text)),
    Effect.map((response) => response.headers["api-version"] || undefined)
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
 * Registry credentials resolve as the Docker CLI resolves them, for every
 * request that needs them: the registry is normalized with
 * `DockerConfig.normalizeRegistry`, then looked up in `authConfig`
 * (`DOCKER_AUTH_CONFIG`), then asked of its credential helper (`credHelpers`,
 * else `credsStore`), else looked up in `auths`. The `ChildProcessSpawner`
 * runs helpers as `docker-credential-<name> get`, every time, because helper
 * tokens are short-lived. A helper that answers "credentials not found in
 * native keychain" means anonymous; one that fails, answers malformed JSON or
 * takes longer than a minute fails with `CredentialsUnavailable`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = (
  httpClient: HttpClient.HttpClient
): Effect.Effect<
  DockerEngine["Service"],
  never,
  DockerConfig.DockerConfig | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function*() {
    const config = yield* DockerConfig.DockerConfig
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const apiVersion = config.apiVersion !== undefined
      ? Effect.succeed(config.apiVersion)
      : onceSuccessful(Effect.flatMap(pingApiVersion(makeClient(config, httpClient)), negotiate))
    return DockerEngine.of({
      config,
      client: makeClient(config, httpClient, apiVersion),
      apiVersion,
      credential: makeCredential(config, spawner)
    })
  })

// -----------------------------------------------------------------------------
// registry credentials
// -----------------------------------------------------------------------------

/** How long a credential helper may take. */
const helperTimeout = Duration.minutes(1)

/** What a credential helper answers when it has no credentials for a registry. */
const helperNotFound = "credentials not found in native keychain"

const HelperOutput = Schema.Struct({ Username: Schema.String, Secret: Schema.String })

const decodeHelperOutput = Schema.decodeUnknownEffect(Schema.fromJsonString(HelperOutput))

const unavailable = (registry: string, message: string, options?: { helper?: string; cause?: unknown }) =>
  new DockerError({ reason: new CredentialsUnavailable({ registry, message, ...options }) })

const isAnonymous = (credential: DockerConfig.Credential) =>
  credential.username === undefined && credential.password === undefined && credential.identityToken === undefined

/** The entry for a normalized registry: under its own key, else under any key that normalizes to it. */
const lookup = <A>(entries: Readonly<Record<string, A>>, key: string): A | undefined =>
  Object.hasOwn(entries, key)
    ? entries[key]
    : Object.entries(entries).find(([registry]) => DockerConfig.normalizeRegistry(registry) === key)?.[1]

const runHelper = (
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  helper: string,
  registry: string
): Effect.Effect<DockerConfig.Credential | undefined, DockerError> => {
  const program = `docker-credential-${helper}`
  return Effect.scoped(Effect.gen(function*() {
    const handle = yield* spawner.spawn(ChildProcess.make(program, ["get"], {
      stdin: Stream.make(new TextEncoder().encode(registry))
    }))
    const [stdout, stderr, exitCode] = yield* Effect.all([
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
      handle.exitCode
    ], { concurrency: "unbounded" })
    if (exitCode !== 0) {
      // the helper protocol answers on stdout
      if (stdout.trim() === helperNotFound) return undefined
      return yield* unavailable(registry, `${program} get exited with ${exitCode}: ${stdout.trim() || stderr.trim()}`, {
        helper
      })
    }
    const output = yield* decodeHelperOutput(stdout.trim()).pipe(
      Effect.mapError((cause) => unavailable(registry, `${program} get answered malformed JSON`, { helper, cause }))
    )
    const credential: DockerConfig.Credential = output.Username === "<token>"
      ? { identityToken: Redacted.make(output.Secret) }
      : { username: output.Username, password: Redacted.make(output.Secret) }
    return credential
  })).pipe(
    Effect.catchTag(
      "PlatformError",
      (cause) => Effect.fail(unavailable(registry, `Failed to run ${program}: ${cause.message}`, { helper, cause }))
    ),
    Effect.timeoutOrElse({
      duration: helperTimeout,
      orElse: () => Effect.fail(unavailable(registry, `${program} get took longer than a minute`, { helper }))
    })
  )
}

/** Resolves credentials as the Docker CLI does, see {@link make}. */
const makeCredential = (
  config: DockerConfig.ResolvedConfig,
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"]
) =>
(registry: string): Effect.Effect<DockerConfig.Credential | undefined, DockerError> => {
  const key = DockerConfig.normalizeRegistry(registry)
  const fromEnvironment = lookup(config.authConfig, key)
  if (fromEnvironment !== undefined && !isAnonymous(fromEnvironment)) return Effect.succeed(fromEnvironment)
  const helper = lookup(config.credHelpers, key) ?? config.credsStore
  if (helper !== undefined && helper !== "") return runHelper(spawner, helper, key)
  const entry = lookup(config.auths, key)
  return Effect.succeed(entry === undefined || isAnonymous(entry) ? undefined : entry)
}

/**
 * A credential as the Engine's `AuthConfig` for a registry, addressed by the
 * registry normalized as the Engine looks it up.
 *
 * @internal
 */
export const authConfig = (registry: string, credential: DockerConfig.Credential): AuthConfig => ({
  ...credential,
  serverAddress: DockerConfig.normalizeRegistry(registry)
})

/**
 * `X-Registry-Auth` for a registry: the call's `auth`, otherwise the engine's
 * credential; anonymous as `{}`.
 *
 * @internal
 */
export const registryAuth = (
  engine: DockerEngine["Service"],
  registry: string,
  auth: DockerConfig.Credential | undefined
): Effect.Effect<AuthConfig, DockerError> =>
  Effect.map(
    auth !== undefined ? Effect.succeed(auth) : engine.credential(registry),
    (credential) => credential === undefined ? {} : authConfig(registry, credential)
  )

// -----------------------------------------------------------------------------
// requests
// -----------------------------------------------------------------------------

/**
 * The Endpoint's address as the Docker CLI writes it, `unix:///path` or
 * `tcp://host:port`, without TLS material.
 *
 * @internal
 */
export const target = (endpoint: typeof DockerConfig.Endpoint.Type): string =>
  endpoint._tag === "Unix" ? `unix://${endpoint.path}` : `tcp://${hostAndPort(endpoint)}`

const hostAndPort = (endpoint: typeof DockerConfig.Endpoint.cases.Tcp.Type): string =>
  `${endpoint.host.includes(":") ? `[${endpoint.host}]` : endpoint.host}:${endpoint.port}`

/** The base URL that transports receive: the host only matters for TCP. */
const baseUrl = (endpoint: typeof DockerConfig.Endpoint.Type): string =>
  endpoint._tag === "Unix"
    ? "http://localhost"
    : `${endpoint.tls !== undefined ? "https" : "http"}://${hostAndPort(endpoint)}`

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
 * with the same message.
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
      target: target(endpoint),
      ...connectionHint(cause, endpoint)
    })
  })

/** The reason of each of `DockerApi`'s error responses. */
const reasons: {
  readonly [Tag in ErrorResponse["_tag"]]: new(fields: ResponseFields) => DockerErrorReason
} = {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  PreconditionFailed,
  TooManyRequests,
  ServerError,
  NotImplemented,
  Unavailable
}

const isErrorResponse = Schema.is(Schema.Union(ErrorResponses))

/** A decoded error response of `operation` as its reason. */
const fromErrorResponse = (response: ErrorResponse, operation: string): DockerError =>
  new DockerError({
    reason: new reasons[response._tag]({ status: errorStatus[response._tag], message: response.message, operation })
  })

/** The decoders of `DockerApi`'s error responses, by status. */
const errorResponses = new Map(
  ErrorResponses.map((schema) => [HttpApiSchema.getStatusErrorSchema(schema), Schema.decodeSync(schema)] as const)
)

/** A response of `operation` that isn't a success, as `DockerApi` declares its status, else `UnexpectedStatus`. */
const statusError = (status: number, body: string, operation: string): DockerError => {
  const decode = errorResponses.get(status)
  return decode === undefined
    ? new DockerError({ reason: new UnexpectedStatus({ status, message: errorMessage(body), operation }) })
    : fromErrorResponse(decode(body), operation)
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
 * Fails a response of `operation` that isn't a success as `apiClient` does,
 * for a request outside `DockerApi`, or one that asks for the response alone.
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
 * `ENV TOKEN=…`, and import sources (presigned URLs, or `user:pass@`).
 */
const redactedUrlParams = ["changes", "fromSrc"]

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

/** `HttpApiClient`'s failure for a response whose status no endpoint schema declares. */
type UnexpectedStatusError = HttpClientError.HttpClientError & {
  readonly reason: HttpClientError.DecodeError & { readonly response: HttpClientResponse.HttpClientResponse }
}

const isUnexpectedStatus = (error: MethodError): error is UnexpectedStatusError =>
  HttpClientError.isHttpClientError(error) && error.reason._tag === "DecodeError" &&
  error.reason.response !== undefined && error.reason.cause === undefined

/**
 * Maps a method's failures to `DockerError`: an error response as its
 * reason, a body that fails to read as `ConnectionFailed`, and one that fails
 * to decode as `InvalidResponse`, naming the operation.
 *
 * @internal
 */
export const toDockerError =
  (engine: DockerEngine["Service"], operation: string) => (error: MethodError): DockerError =>
    isDockerError(error)
      ? error
      : isErrorResponse(error)
      ? fromErrorResponse(error, operation)
      : isUnexpectedStatus(error)
      ? new DockerError({
        reason: new InvalidResponse({
          issue: `unexpected status ${error.reason.response.status}`,
          operation,
          cause: error
        })
      })
      : HttpClientError.isHttpClientError(error) && error.reason._tag !== "DecodeError"
      ? connectionFailed(engine.config.endpoint, error)
      : new DockerError({
        reason: new InvalidResponse({
          issue: Schema.isSchemaError(error) ? error.issue : error.message,
          operation,
          cause: error
        })
      })

/**
 * Runs an effect as the operation `name`: in a span of that name, and its
 * failures as `DockerError` naming the operation. For methods that aren't one
 * HttpApi request.
 *
 * @internal
 */
export const withOperation =
  (engine: DockerEngine["Service"], name: string) =>
  <A, R>(self: Effect.Effect<A, MethodError, R>): Effect.Effect<A, DockerError, R> =>
    self.pipe(
      Effect.mapError(toDockerError(engine, name)),
      Effect.withSpan(name)
    )

// -----------------------------------------------------------------------------
// API version gates
// -----------------------------------------------------------------------------

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
 * `<operations>.<endpoint>` (e.g. `docker.System.info`), and fails only with
 * `DockerError`, naming that operation. A streamed success is returned as the
 * `Stream`, and its failures are mapped too, also for a stream with headers.
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
          const versions = Context.getOrUndefined(endpoint.annotations as Context.Context<ApiVersions>, ApiVersions)
          const streamed = Array.from(endpoint.success).some(HttpApiSchema.isStreamSchema)
          // an error status `DockerApi` doesn't declare, with the message of its body
          const send = (request: unknown) =>
            Effect.catchIf(
              method(request),
              (error) => isUnexpectedStatus(error) && error.reason.response.status >= 400,
              (error) => filterStatus(name)((error as UnexpectedStatusError).reason.response)
            )
          return [id, (request: unknown) => {
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
              Effect.mapError(mapError),
              Effect.withSpan(name)
            )
            const mode = typeof request === "object" && request !== null && "responseMode" in request
              ? request.responseMode
              : undefined
            return streamed && (mode === undefined || mode === "decoded-only")
              ? Stream.unwrap(response as Effect.Effect<Stream.Stream<unknown, DockerError>, DockerError>)
              : response
          }]
        })
      ) as ApiClient<Group>
  )
