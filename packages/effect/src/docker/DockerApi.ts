/**
 * The Docker Engine API as `HttpApi` endpoint groups: one group per area,
 * which the `effect/docker` services are clients of, and {@link DockerApi}
 * with all of them.
 *
 * **Details**
 *
 * The groups describe requests as the client sends them, and responses as
 * the Engine answers them:
 *
 * - Paths have no `/v1.xx` prefix: the `DockerEngine`'s `HttpClient` adds
 *   the negotiated version.
 * - Every endpoint declares the Engine's {@link ErrorResponses} with
 *   {@link EngineErrors}, or {@link SwarmErrorResponses} with
 *   {@link SwarmErrors} when Swarm serves it. They decode to the
 *   `DockerError` reason classes.
 * - Query booleans are `true` and `false`; the Engine also reads `1` and
 *   `0`, which the Docker CLI sends.
 * - Fields that carry secrets are `Redacted`; requests send them
 *   unwrapped.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as DateTime from "../DateTime.ts"
import * as Duration from "../Duration.ts"
import * as HttpApi from "../http-api/HttpApi.ts"
import * as HttpApiEndpoint from "../http-api/HttpApiEndpoint.ts"
import * as HttpApiGroup from "../http-api/HttpApiGroup.ts"
import * as HttpApiMiddleware from "../http-api/HttpApiMiddleware.ts"
import * as HttpApiSchema from "../http-api/HttpApiSchema.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as DockerError from "./DockerError.ts"
import * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// annotations
// -----------------------------------------------------------------------------

/**
 * An endpoint annotation: the API version the endpoint arrived in when it is
 * newer than 1.44, and the request fields newer than 1.44, each with the
 * version it arrived in.
 *
 * **Details**
 *
 * A key names a field of the request's `query` or `payload` as the caller
 * passes it, a dotted key (`HostConfig.Init`) a nested one, and a `*` key any
 * element of an array or entry of a map
 * (`HostConfig.Mounts.*.VolumeOptions.Subpath`). The services of
 * `effect/docker` fail a request that sets one with `OptionNotSupported`
 * when the negotiated version is older, before anything is sent. An Engine
 * that predates a field ignores it or rejects the request, so a client of
 * {@link DockerApi} of your own can check them the same way.
 *
 * **Example** (Reading the version an endpoint arrived in)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 * import { DockerApi } from "effect/docker"
 *
 * const endpoint = DockerApi.Images.endpoints.attestations
 * const versions = Context.getOrUndefined(endpoint.annotations, DockerApi.ApiVersions)
 * console.log(versions?.endpoint) // "1.55"
 * ```
 *
 * @stability unstable
 * @category annotations
 * @since 4.0.6
 */
export class ApiVersions extends Context.Service<ApiVersions, {
  /** The version the endpoint itself arrived in. */
  readonly endpoint?: string | undefined
  readonly query?: Readonly<Record<string, string>> | undefined
  readonly payload?: Readonly<Record<string, string>> | undefined
}>()("effect/docker/DockerApi/ApiVersions") {}

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

const decodeErrorBody = Schema.decodeUnknownOption(Schema.fromJsonString(DockerSchema.ErrorResponse))

/**
 * The message of an error response's body: the Engine's `{ message }` JSON,
 * otherwise the trimmed text, such as a proxy's.
 *
 * @internal
 */
export const errorMessage = (body: string): string =>
  Option.match(decodeErrorBody(body), { onNone: () => body.trim(), onSome: ({ message }) => message })

/**
 * An error class on the wire: its status, and the Engine's `{ message }` JSON
 * body, decoded as {@link errorMessage} reads it.
 */
const errorResponse = <
  const Tag extends string,
  S extends Schema.Codec<
    { readonly _tag: Tag; readonly message: string },
    { readonly _tag: Tag; readonly message: string }
  >
>(error: S, tag: Tag, status: number) =>
  Schema.String.pipe(
    Schema.decodeTo(
      error,
      SchemaTransformation.transform({
        decode: (body) => ({ _tag: tag, message: errorMessage(body) }),
        encode: ({ message }) => JSON.stringify({ message })
      })
    ),
    HttpApiSchema.asText({ contentType: "application/json" }),
    HttpApiSchema.status(status)
  )

const BadRequestResponse = errorResponse(DockerError.BadRequest, "BadRequest", 400)
const UnauthorizedResponse = errorResponse(DockerError.Unauthorized, "Unauthorized", 401)
const ForbiddenResponse = errorResponse(DockerError.Forbidden, "Forbidden", 403)
const NotFoundResponse = errorResponse(DockerError.NotFound, "NotFound", 404)
const ConflictResponse = errorResponse(DockerError.Conflict, "Conflict", 409)
const PreconditionFailedResponse = errorResponse(DockerError.PreconditionFailed, "PreconditionFailed", 412)
const TooManyRequestsResponse = errorResponse(DockerError.TooManyRequests, "TooManyRequests", 429)
const ServerErrorResponse = errorResponse(DockerError.ServerError, "ServerError", 500)
const NotImplementedResponse = errorResponse(DockerError.NotImplemented, "NotImplemented", 501)

/**
 * The Engine's error responses, one per status of moby's table: every
 * endpoint can answer each of them, as moby maps its kinds of error to
 * statuses the same way for every handler (the API document lists only some
 * per operation). Each decodes to its `DockerError` reason class, which a
 * server handler fails with.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export const ErrorResponses = [
  BadRequestResponse,
  UnauthorizedResponse,
  ForbiddenResponse,
  NotFoundResponse,
  ConflictResponse,
  PreconditionFailedResponse,
  TooManyRequestsResponse,
  ServerErrorResponse,
  NotImplementedResponse,
  errorResponse(DockerError.Unavailable, "Unavailable", 503)
] as const

/**
 * One of the Engine's {@link ErrorResponses}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ErrorResponse = typeof ErrorResponses[number]["Type"]

/**
 * The error responses of the endpoints Swarm serves: {@link ErrorResponses},
 * with 503 as `SwarmUnavailable`, which the Engine answers when the node
 * can't serve Swarm requests in its current state.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export const SwarmErrorResponses = [
  BadRequestResponse,
  UnauthorizedResponse,
  ForbiddenResponse,
  NotFoundResponse,
  ConflictResponse,
  PreconditionFailedResponse,
  TooManyRequestsResponse,
  ServerErrorResponse,
  NotImplementedResponse,
  errorResponse(DockerError.SwarmUnavailable, "SwarmUnavailable", 503)
] as const

/**
 * One of the {@link SwarmErrorResponses}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type SwarmErrorResponse = typeof SwarmErrorResponses[number]["Type"]

/**
 * Declares {@link ErrorResponses} on every endpoint of a group. Clients don't
 * need it; a server provides it as a middleware that passes requests through.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class EngineErrors extends HttpApiMiddleware.Service<EngineErrors>()("effect/docker/DockerApi/EngineErrors", {
  error: ErrorResponses
}) {}

/**
 * Declares {@link SwarmErrorResponses} on the endpoints Swarm serves, as
 * {@link EngineErrors} declares {@link ErrorResponses}.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class SwarmErrors extends HttpApiMiddleware.Service<SwarmErrors>()("effect/docker/DockerApi/SwarmErrors", {
  error: SwarmErrorResponses
}) {}

// -----------------------------------------------------------------------------
// parameters
// -----------------------------------------------------------------------------

const id = { id: Schema.String }
const name = { name: Schema.String }

/**
 * The media type of a container's output stream, which logs, attach and exec
 * start answer with: `multiplexed-stream` frames stdout and stderr,
 * `raw-stream` is the output of a TTY as it is.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const StreamContentType = Schema.Literals([
  "application/vnd.docker.raw-stream",
  "application/vnd.docker.multiplexed-stream"
])

/**
 * The media type of a container's output stream, see {@link StreamContentType}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type StreamContentType = typeof StreamContentType.Type

/** The headers of an output stream's response, or of its `101`: the `Content-Type` says how it is framed. */
const streamHeaders = { "content-type": Schema.optional(StreamContentType) }

/**
 * Filters of a list or prune: values by key, one value as a string, as the Engine's JSON `map[string][]string` query parameter.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Filters = Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Array(Schema.String)])).pipe(
  Schema.encodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: (json: string) => JSON.parse(json),
      encode: (filters) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(filters).map(([key, value]) => [key, typeof value === "string" ? [value] : value])
          )
        )
    })
  )
)

/**
 * Filters of a list or prune, see {@link Filters}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Filters = typeof Filters.Type

const filters = Schema.optional(Filters)

/** A time as Unix seconds, for `since` and `until`: any `DateTime.Input`. */
const UnixSeconds = Schema.String.pipe(
  Schema.decodeTo(
    Schema.declare((u): u is DateTime.DateTime.Input => Option.isSome(DateTime.make(u as DateTime.DateTime.Input))),
    SchemaTransformation.transform<DateTime.DateTime.Input, string>({
      decode: (seconds) => Number(seconds) * 1000,
      encode: (input) => String(Math.floor(DateTime.toEpochMillis(DateTime.makeUnsafe(input)) / 1000))
    })
  )
)

/**
 * A duration as whole seconds, rounded up, for `t` and `timeout`: any
 * `Duration.Input`. An infinite duration is `-1`, the Engine's "wait forever".
 */
const DurationSeconds = Schema.String.pipe(
  Schema.decodeTo(
    Schema.declare((u): u is Duration.Input => Option.isSome(Duration.fromInput(u as Duration.Input))),
    SchemaTransformation.transform<Duration.Input, string>({
      decode: (seconds) => Number(seconds) < 0 ? Duration.infinity : Duration.seconds(Number(seconds)),
      encode: (input) => {
        const duration = Duration.fromInputUnsafe(input)
        return String(Duration.isFinite(duration) ? Math.ceil(Duration.toMillis(duration) / 1000) : -1)
      }
    })
  )
)

/**
 * `KEY=value` entries (a container's `Env`, a plugin's settings): each a
 * string, or a `Redacted` one that is sent unwrapped.
 */
const Env = Schema.Array(Schema.Union([Schema.String, Schema.RedactedFromValue(Schema.String)]))

const tar = HttpApiSchema.StreamUint8Array({ contentType: "application/x-tar" })

// -----------------------------------------------------------------------------
// system
// -----------------------------------------------------------------------------

/**
 * What `/_ping` reports about the Engine, from its headers.
 *
 * **Details**
 *
 * `apiVersion` is the Engine's maximum API version (`Api-Version`), not the
 * negotiated one. `builderVersion` is the default Builder the Engine
 * advertises; it never changes which Builder a build uses. `experimental` is
 * whether the Engine runs with experimental features (`Docker-Experimental`).
 *
 * `swarm` is the node's Swarm state (`Swarm`), without the `503` the Swarm
 * endpoints answer outside a Swarm: `nodeState` as in `info`'s
 * `Swarm.LocalNodeState`, and `controlAvailable` whether the node is an active
 * manager. It is `undefined` when the Engine doesn't report it.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const PingInfo = Schema.Struct({
  apiVersion: Schema.UndefinedOr(Schema.String),
  osType: Schema.UndefinedOr(Schema.String),
  builderVersion: Schema.UndefinedOr(Schema.String),
  experimental: Schema.Boolean,
  swarm: Schema.UndefinedOr(Schema.Struct({ nodeState: DockerSchema.LocalNodeState, controlAvailable: Schema.Boolean }))
})

/**
 * What `/_ping` reports about the Engine, see {@link PingInfo}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type PingInfo = typeof PingInfo.Type

/** What `/_ping` answers: only its headers count. */
const Ping = PingInfo.pipe(HttpApiSchema.encodeToWithHeaders({
  body: Schema.String.pipe(HttpApiSchema.asText()),
  headers: {
    "api-version": Schema.optional(Schema.String),
    "ostype": Schema.optional(Schema.String),
    "builder-version": Schema.optional(Schema.String),
    "docker-experimental": Schema.optional(Schema.String),
    // `<state>`, or `active/manager` and `active/worker`
    "swarm": Schema.optional(Schema.String)
  }
}, {
  decode: ({ headers }) => {
    const [nodeState, role] = headers.swarm?.split("/", 2) ?? []
    return {
      apiVersion: headers["api-version"] || undefined,
      osType: headers.ostype || undefined,
      builderVersion: headers["builder-version"] || undefined,
      experimental: headers["docker-experimental"] === "true",
      swarm: nodeState ? { nodeState, controlAvailable: role === "manager" } : undefined
    }
  },
  encode: (info) => ({
    body: "OK",
    headers: {
      "api-version": info.apiVersion,
      "ostype": info.osType,
      "builder-version": info.builderVersion,
      "docker-experimental": String(info.experimental),
      "swarm": info.swarm === undefined
        ? undefined
        : info.swarm.nodeState === "active"
        ? `active/${info.swarm.controlAvailable ? "manager" : "worker"}`
        : info.swarm.nodeState
    }
  })
}))

/**
 * Registry credentials, as the Engine's `AuthConfig`: a username and password, or an identity token, and the registry they are for.
 *
 * **Details**
 *
 * The password and the identity token are `Redacted`. `identityToken` and
 * `serverAddress` are the Engine's `identitytoken` and `serveraddress`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const AuthConfig = DockerSchema.AuthConfig.mapFields(({ serveraddress, ...fields }) => ({
  ...fields,
  password: Schema.optionalKey(Schema.RedactedFromValue(Schema.String)),
  identityToken: Schema.optionalKey(Schema.RedactedFromValue(Schema.String)),
  serverAddress: serveraddress
})).pipe(Schema.encodeKeys({ identityToken: "identitytoken", serverAddress: "serveraddress" }))

/**
 * Registry credentials, see {@link AuthConfig}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type AuthConfig = typeof AuthConfig.Type

/**
 * What the Engine answers a login with, as its `AuthResponse`: the identity token is `Redacted`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const AuthResponse = DockerSchema.AuthResponse.mapFields((fields) => ({
  ...fields,
  IdentityToken: Schema.optionalKey(Schema.RedactedFromValue(Schema.String))
}))

/**
 * What the Engine answers a login with, see {@link AuthResponse}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type AuthResponse = typeof AuthResponse.Type

/** A body of only whitespace, as `undefined`. */
const Blank = Schema.String.check(Schema.isPattern(/^\s*$/)).pipe(
  Schema.decodeTo(Schema.Undefined, SchemaTransformation.transform({ decode: () => undefined, encode: () => "" }))
)

/** No content (204), as `undefined`. */
const NoBody = Schema.Void.pipe(
  Schema.decodeTo(
    Schema.Undefined,
    SchemaTransformation.transform<undefined, void>({ decode: () => undefined, encode: () => undefined })
  ),
  HttpApiSchema.status(204)
)

/**
 * The Engine's system endpoints, which `DockerSystem` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const System = HttpApiGroup.make("system").add(
  HttpApiEndpoint.get("ping", "/_ping", { success: Ping }),
  HttpApiEndpoint.head("pingHead", "/_ping", { success: Ping }),
  HttpApiEndpoint.get("version", "/version", { success: Schema.toCodecGoJson(DockerSchema.SystemVersion) }),
  HttpApiEndpoint.get("info", "/info", { success: Schema.toCodecGoJson(DockerSchema.SystemInfo) }),
  HttpApiEndpoint.get("events", "/events", {
    query: { since: Schema.optional(UnixSeconds), until: Schema.optional(UnixSeconds), filters },
    // the Engine answers `application/json`, one message per line
    success: HttpApiSchema.StreamNdjson({
      schema: Schema.toCodecGoJson(DockerSchema.EventMessage),
      contentType: "application/json"
    })
  }),
  HttpApiEndpoint.get("df", "/system/df", {
    query: {
      type: Schema.optional(Schema.Array(Schema.Literals(["container", "image", "volume", "build-cache"]))),
      verbose: Schema.optional(Schema.Boolean)
    },
    success: Schema.toCodecGoJson(DockerSchema.SystemDataUsageResponse)
  }).annotate(ApiVersions, { query: { verbose: "1.52" } }),
  HttpApiEndpoint.post("auth", "/auth", {
    payload: AuthConfig,
    success: [
      // an Engine that accepts the login without a token may answer with no body, whatever its status
      Schema.Union([Schema.fromJsonString(Schema.toCodecGoJson(AuthResponse)), Blank]).pipe(
        HttpApiSchema.asText({ contentType: "application/json" })
      ),
      NoBody
    ]
  }),
  HttpApiEndpoint.post("pruneBuildCache", "/build/prune", {
    query: Schema.Struct({
      all: Schema.optional(Schema.Boolean),
      filters,
      reservedSpace: Schema.optional(Schema.Number),
      keepStorage: Schema.optional(Schema.Number),
      maxUsedSpace: Schema.optional(Schema.Number),
      minFreeSpace: Schema.optional(Schema.Number)
    }).pipe(Schema.encodeKeys({
      reservedSpace: "reserved-space",
      keepStorage: "keep-storage",
      maxUsedSpace: "max-used-space",
      minFreeSpace: "min-free-space"
    })),
    success: Schema.toCodecGoJson(DockerSchema.BuildPruneResponse)
  }).annotate(ApiVersions, { query: { reservedSpace: "1.48", maxUsedSpace: "1.48", minFreeSpace: "1.48" } })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// containers
// -----------------------------------------------------------------------------

/**
 * The stat of a path in a container, from the `X-Docker-Container-Path-Stat`
 * header.
 *
 * **Details**
 *
 * `mode` is a Go `os.FileMode`, not a POSIX mode: directories have bit 31
 * set and symlinks bit 27. `linkTarget` is the target of a symlink, and empty
 * otherwise.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const PathStat = Schema.Struct({
  name: Schema.String,
  size: Schema.Number,
  mode: Schema.Number,
  mtime: Schema.String,
  linkTarget: Schema.String
})

/**
 * The stat of a path in a container.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type PathStat = typeof PathStat.Type

const signal = Schema.optional(Schema.String)

/**
 * A container's configuration, as the Engine's `ContainerCreateRequest`, whose `Env` entries can be `Redacted`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ContainerCreateRequest = DockerSchema.ContainerCreateRequest.mapFields((fields) => ({
  ...fields,
  Env: Schema.optionalKey(Env)
}))

/**
 * A container's configuration, see {@link ContainerCreateRequest}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ContainerCreateRequest = typeof ContainerCreateRequest.Type

/** `stop` and `restart`: a signal, and the grace period as the Engine's `t`. */
const StopQuery = Schema.Struct({ signal, timeout: Schema.optional(DurationSeconds) }).pipe(
  Schema.encodeKeys({ timeout: "t" })
)

/**
 * The size of a TTY, in character cells, as the Engine's `h` and `w` query parameters.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const TtySize = Schema.Struct({ rows: Schema.Number, columns: Schema.Number }).pipe(
  Schema.encodeKeys({ rows: "h", columns: "w" })
)

/**
 * The size of a TTY, in character cells.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type TtySize = typeof TtySize.Type

/** 304 for a container already started, or already stopped. */
const NotModified = HttpApiSchema.Empty(304)

/** The `X-Docker-Container-Path-Stat` header: base64 JSON. */
const PathStatHeader = Schema.StringFromBase64.pipe(
  Schema.decodeTo(Schema.fromJsonString(Schema.toCodecGoJson(PathStat)))
)

const pathStatHeader = "x-docker-container-path-stat"

/**
 * The Engine's container endpoints, which `DockerContainers` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Containers = HttpApiGroup.make("containers").add(
  HttpApiEndpoint.get("list", "/containers/json", {
    query: {
      all: Schema.optional(Schema.Boolean),
      limit: Schema.optional(Schema.Number),
      size: Schema.optional(Schema.Boolean),
      filters
    },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.ContainerSummary))
  }).annotate(ApiVersions, { query: { "filters.annotation": "1.56" } }),
  HttpApiEndpoint.post("create", "/containers/create", {
    query: { name: Schema.optional(Schema.String), platform: Schema.optional(Schema.String) },
    payload: ContainerCreateRequest,
    success: Schema.toCodecGoJson(DockerSchema.ContainerCreateResponse).pipe(HttpApiSchema.status(201))
  }).annotate(ApiVersions, {
    payload: {
      "HostConfig.Umask": "1.56",
      "HostConfig.Mounts.*.VolumeOptions.Subpath": "1.45",
      "HostConfig.Mounts.*.TmpfsOptions.Options": "1.46",
      "HostConfig.Mounts.*.ImageOptions": "1.48",
      "NetworkingConfig.EndpointsConfig.*.GwPriority": "1.48"
    }
  }),
  HttpApiEndpoint.get("inspect", "/containers/:id/json", {
    params: id,
    query: { size: Schema.optional(Schema.Boolean) },
    success: Schema.toCodecGoJson(DockerSchema.ContainerInspectResponse)
  }),
  HttpApiEndpoint.get("top", "/containers/:id/top", {
    params: id,
    query: Schema.Struct({ psArgs: Schema.optional(Schema.String) }).pipe(Schema.encodeKeys({ psArgs: "ps_args" })),
    success: Schema.toCodecGoJson(DockerSchema.ContainerTopResponse)
  }),
  HttpApiEndpoint.get("changes", "/containers/:id/changes", {
    params: id,
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.FilesystemChange))
  }),
  HttpApiEndpoint.post("start", "/containers/:id/start", {
    params: id,
    query: { detachKeys: Schema.optional(Schema.String) },
    success: [HttpApiSchema.NoContent, NotModified]
  }),
  HttpApiEndpoint.post("stop", "/containers/:id/stop", {
    params: id,
    query: StopQuery,
    success: [HttpApiSchema.NoContent, NotModified]
  }),
  HttpApiEndpoint.post("restart", "/containers/:id/restart", {
    params: id,
    query: StopQuery,
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("kill", "/containers/:id/kill", {
    params: id,
    query: { signal },
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("pause", "/containers/:id/pause", { params: id, success: HttpApiSchema.NoContent }),
  HttpApiEndpoint.post("unpause", "/containers/:id/unpause", { params: id, success: HttpApiSchema.NoContent }),
  HttpApiEndpoint.post("rename", "/containers/:id/rename", {
    params: id,
    query: { name: Schema.String },
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("resize", "/containers/:id/resize", {
    params: id,
    query: TtySize,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("update", "/containers/:id/update", {
    params: id,
    payload: DockerSchema.ContainerUpdateRequest,
    success: Schema.toCodecGoJson(DockerSchema.ContainerUpdateResponse)
  }).annotate(ApiVersions, {
    // older Engines accepted and ignored them
    payload: {
      BlkioWeightDevice: "1.55",
      BlkioDeviceReadBps: "1.55",
      BlkioDeviceWriteBps: "1.55",
      BlkioDeviceReadIOps: "1.55",
      BlkioDeviceWriteIOps: "1.55"
    }
  }),
  HttpApiEndpoint.post("wait", "/containers/:id/wait", {
    params: id,
    query: { condition: Schema.optional(Schema.Literals(["not-running", "next-exit", "removed"])) },
    success: Schema.toCodecGoJson(DockerSchema.ContainerWaitResponse)
  }),
  HttpApiEndpoint.delete("remove", "/containers/:id", {
    params: id,
    query: Schema.Struct({
      force: Schema.optional(Schema.Boolean),
      volumes: Schema.optional(Schema.Boolean),
      link: Schema.optional(Schema.Boolean)
    }).pipe(Schema.encodeKeys({ volumes: "v" })),
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("prune", "/containers/prune", {
    query: { filters },
    success: Schema.toCodecGoJson(DockerSchema.ContainerPruneResponse)
  }),
  HttpApiEndpoint.get("logs", "/containers/:id/logs", {
    params: id,
    query: {
      follow: Schema.optional(Schema.Boolean),
      stdout: Schema.optional(Schema.Boolean),
      stderr: Schema.optional(Schema.Boolean),
      since: Schema.optional(UnixSeconds),
      until: Schema.optional(UnixSeconds),
      timestamps: Schema.optional(Schema.Boolean),
      tail: Schema.optional(Schema.Union([Schema.Number, Schema.Literal("all")]))
    },
    // raw or multiplexed, as the `Content-Type` says
    success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), streamHeaders)
  }),
  HttpApiEndpoint.get("stats", "/containers/:id/stats", {
    params: id,
    query: Schema.Struct({ stream: Schema.Literal(false), oneShot: Schema.optional(Schema.Boolean) }).pipe(
      Schema.encodeKeys({ oneShot: "one-shot" })
    ),
    success: Schema.toCodecGoJson(DockerSchema.ContainerStatsResponse)
  }),
  HttpApiEndpoint.get("statsStream", "/containers/:id/stats", {
    params: id,
    query: { stream: Schema.Literal(true) },
    // the Engine answers `application/json`, one sample per line
    success: HttpApiSchema.StreamNdjson({
      schema: Schema.toCodecGoJson(DockerSchema.ContainerStatsResponse),
      contentType: "application/json"
    })
  }),
  HttpApiEndpoint.get("export", "/containers/:id/export", {
    params: id,
    success: HttpApiSchema.StreamUint8Array({ contentType: "application/octet-stream" })
  }),
  HttpApiEndpoint.post("attach", "/containers/:id/attach", {
    params: id,
    query: {
      stream: Schema.optional(Schema.Boolean),
      stdin: Schema.optional(Schema.Boolean),
      stdout: Schema.optional(Schema.Boolean),
      stderr: Schema.optional(Schema.Boolean),
      logs: Schema.optional(Schema.Boolean),
      detachKeys: Schema.optional(Schema.String)
    },
    success: HttpApiSchema.Upgrade({ protocol: "tcp", headers: streamHeaders })
  }),
  HttpApiEndpoint.head("statPath", "/containers/:id/archive", {
    params: id,
    query: { path: Schema.String },
    success: PathStat.pipe(HttpApiSchema.encodeToWithHeaders({
      body: HttpApiSchema.Empty(200),
      headers: { [pathStatHeader]: PathStatHeader }
    }, {
      decode: ({ headers }) => headers[pathStatHeader],
      encode: (stat) => ({ body: undefined, headers: { [pathStatHeader]: stat } })
    }))
  }),
  HttpApiEndpoint.get("getArchive", "/containers/:id/archive", {
    params: id,
    query: { path: Schema.String },
    success: HttpApiSchema.WithHeaders(tar, { [pathStatHeader]: PathStatHeader })
  }),
  HttpApiEndpoint.put("putArchive", "/containers/:id/archive", {
    params: id,
    query: {
      path: Schema.String,
      noOverwriteDirNonDir: Schema.optional(Schema.Boolean),
      copyUIDGID: Schema.optional(Schema.Boolean)
    },
    payload: tar,
    success: HttpApiSchema.Empty(200)
  })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// exec
// -----------------------------------------------------------------------------

/**
 * An exec's configuration, as the Engine's `ExecConfig`, whose `Env` entries can be `Redacted`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExecConfig = DockerSchema.ExecConfig.mapFields((fields) => ({ ...fields, Env: Schema.optionalKey(Env) }))

/**
 * An exec's configuration, see {@link ExecConfig}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ExecConfig = typeof ExecConfig.Type

/**
 * How to start an exec, as the Engine's `ExecStartConfig`, attached to its
 * stdio: `Detach` can only be `false`. A detached start answers `200` instead
 * of upgrading the connection, which an upgrade endpoint can't declare.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExecStartConfig = DockerSchema.ExecStartConfig.mapFields((fields) => ({
  ...fields,
  Detach: Schema.optionalKey(Schema.Literal(false))
}))

/**
 * How to start an exec, see {@link ExecStartConfig}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ExecStartConfig = typeof ExecStartConfig.Type

/**
 * The Engine's exec endpoints, which `DockerExec` is a client of. Starting an
 * exec upgrades its request, which carries the start options, to the exec's
 * stdio, framed as the `101`'s `Content-Type` says.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Exec = HttpApiGroup.make("exec").add(
  HttpApiEndpoint.post("create", "/containers/:id/exec", {
    params: id,
    payload: ExecConfig,
    success: Schema.toCodecGoJson(DockerSchema.IDResponse).pipe(HttpApiSchema.status(201))
  }),
  HttpApiEndpoint.get("inspect", "/exec/:id/json", {
    params: id,
    success: Schema.toCodecGoJson(DockerSchema.ExecInspectResponse)
  }),
  HttpApiEndpoint.post("start", "/exec/:id/start", {
    params: id,
    payload: ExecStartConfig,
    success: HttpApiSchema.Upgrade({ protocol: "tcp", headers: streamHeaders })
  }),
  HttpApiEndpoint.post("resize", "/exec/:id/resize", {
    params: id,
    query: TtySize,
    success: HttpApiSchema.Empty(200)
  })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// networks
// -----------------------------------------------------------------------------

/**
 * The Engine's network endpoints, which `DockerNetworks` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Networks = HttpApiGroup.make("networks").add(
  HttpApiEndpoint.get("list", "/networks", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.NetworkSummary))
  }),
  HttpApiEndpoint.get("inspect", "/networks/:id", {
    params: id,
    query: { verbose: Schema.optional(Schema.Boolean), scope: Schema.optional(Schema.String) },
    success: Schema.toCodecGoJson(DockerSchema.NetworkInspect)
  }),
  HttpApiEndpoint.post("create", "/networks/create", {
    payload: DockerSchema.NetworkCreateRequest,
    success: Schema.toCodecGoJson(DockerSchema.NetworkCreateResponse).pipe(HttpApiSchema.status(201))
  }).annotate(ApiVersions, { payload: { EnableIPv4: "1.48" } }),
  HttpApiEndpoint.delete("remove", "/networks/:id", {
    params: id,
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("connect", "/networks/:id/connect", {
    params: id,
    payload: DockerSchema.NetworkConnectRequest,
    success: HttpApiSchema.Empty(200)
  }).annotate(ApiVersions, {
    // older Engines ignored a MAC address here
    payload: { "EndpointConfig.GwPriority": "1.48", "EndpointConfig.MacAddress": "1.54" }
  }),
  HttpApiEndpoint.post("disconnect", "/networks/:id/disconnect", {
    params: id,
    payload: DockerSchema.NetworkDisconnectRequest,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("prune", "/networks/prune", {
    query: { filters },
    success: Schema.toCodecGoJson(DockerSchema.NetworkPruneResponse)
  })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// volumes
// -----------------------------------------------------------------------------

/**
 * The Engine's volume endpoints, which `DockerVolumes` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Volumes = HttpApiGroup.make("volumes").add(
  HttpApiEndpoint.get("list", "/volumes", {
    query: { filters },
    success: Schema.toCodecGoJson(DockerSchema.VolumeListResponse)
  }),
  HttpApiEndpoint.get("inspect", "/volumes/:name", {
    params: name,
    success: Schema.toCodecGoJson(DockerSchema.Volume)
  }),
  HttpApiEndpoint.delete("remove", "/volumes/:name", {
    params: name,
    query: { force: Schema.optional(Schema.Boolean) },
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("prune", "/volumes/prune", {
    query: { filters },
    success: Schema.toCodecGoJson(DockerSchema.VolumePruneResponse)
  })
).middleware(EngineErrors).add(
  // Swarm serves cluster volumes: a create with a `ClusterVolumeSpec`, outside a Swarm manager a 503, and updates
  HttpApiEndpoint.post("create", "/volumes/create", {
    payload: DockerSchema.VolumeCreateRequest,
    success: Schema.toCodecGoJson(DockerSchema.Volume).pipe(HttpApiSchema.status(201))
  }).middleware(SwarmErrors),
  HttpApiEndpoint.put("update", "/volumes/:name", {
    params: name,
    query: { version: Schema.Number },
    payload: DockerSchema.VolumeUpdateRequest,
    success: HttpApiSchema.Empty(200)
  }).middleware(SwarmErrors)
)

// -----------------------------------------------------------------------------
// images
// -----------------------------------------------------------------------------

/** An OCI platform as the JSON the Engine reads from `platform`. */
const Platform = Schema.fromJsonString(DockerSchema.OCIPlatform)

/** One platform, or several as a repeated `platform`. */
const Platforms = Schema.Union([Platform, Schema.Array(Platform)])

/** Go's padded `base64.URLEncoding`, which the Engine decodes registry headers with. */
const base64UrlPadded = SchemaTransformation.makeTransformation({
  decode: SchemaGetter.decodeBase64UrlString<string>(),
  encode: SchemaGetter.encodeBase64Url<string>({ padding: true })
})

/**
 * `X-Registry-Auth`: a credential as the Engine's `AuthConfig` JSON, with the
 * registry it is for; anonymous as `{}`. The Engine ignores standard base64
 * and pulls anonymously, so the alphabet matters.
 */
const RegistryAuth = Schema.String.pipe(
  Schema.decodeTo(Schema.fromJsonString(AuthConfig), base64UrlPadded)
)

/**
 * `X-Registry-Config` of a build: credentials keyed by registry, each as the
 * Engine's `AuthConfig` JSON with the registry it is for.
 */
const RegistryConfig = Schema.String.pipe(
  Schema.decodeTo(Schema.fromJsonString(Schema.Record(Schema.String, AuthConfig)), base64UrlPadded)
)

/**
 * A progress message; the Engine still sends the deprecated `error` beside
 * `errorDetail`.
 *
 * @internal
 */
export const Progress = Schema.toCodecGoJson(
  DockerSchema.ProgressMessage.mapFields((fields) => ({ ...fields, error: Schema.optionalKey(Schema.String) }))
)

/** The Engine's progress stream: one JSON message per line, as `application/json`. */
const progress = HttpApiSchema.StreamNdjson({ schema: Progress, contentType: "application/json" })

const importQuery = {
  repo: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  changes: Schema.optional(Schema.Array(Schema.String)),
  platform: Schema.optional(Schema.String)
}

/** `version`: the builder, as the Engine numbers them. */
const Builder = Schema.Literals(["1", "2"]).pipe(
  Schema.decodeTo(
    Schema.Literals(["classic", "buildkit"]),
    SchemaTransformation.transform({
      decode: (version) => version === "2" ? "buildkit" as const : "classic" as const,
      encode: (builder) => builder === "buildkit" ? "2" as const : "1" as const
    })
  )
)

/** The query of `POST /build`, from `DockerImages.BuildOptions`. */
const buildFields = {
  dockerfile: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  builder: Schema.optional(Builder),
  forceRemove: Schema.optional(Schema.Boolean),
  remove: Schema.optional(Schema.Boolean),
  target: Schema.optional(Schema.String),
  platform: Schema.optional(Schema.String),
  buildArgs: Schema.optional(
    Schema.fromJsonString(
      Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.RedactedFromValue(Schema.String)]))
    )
  ),
  labels: Schema.optional(Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))),
  cacheFrom: Schema.optional(Schema.fromJsonString(Schema.Array(Schema.String))),
  pull: Schema.optional(Schema.Boolean),
  noCache: Schema.optional(Schema.Boolean),
  quiet: Schema.optional(Schema.Boolean),
  networkMode: Schema.optional(Schema.String),
  extraHosts: Schema.optional(Schema.Array(Schema.String)),
  shmSize: Schema.optional(Schema.Number),
  memory: Schema.optional(Schema.Number),
  memorySwap: Schema.optional(Schema.Number),
  cpuShares: Schema.optional(Schema.Number),
  cpuSetCpus: Schema.optional(Schema.String),
  cpuPeriod: Schema.optional(Schema.Number),
  cpuQuota: Schema.optional(Schema.Number),
  squash: Schema.optional(Schema.Boolean),
  outputs: Schema.optional(Schema.fromJsonString(Schema.Array(Schema.Struct({
    Type: Schema.String,
    Attrs: Schema.optionalKey(Schema.Record(Schema.String, Schema.String))
  }))))
}

const buildKeys = {
  tags: "t",
  builder: "version",
  forceRemove: "forcerm",
  remove: "rm",
  buildArgs: "buildargs",
  cacheFrom: "cachefrom",
  noCache: "nocache",
  quiet: "q",
  networkMode: "networkmode",
  extraHosts: "extrahosts",
  shmSize: "shmsize",
  memorySwap: "memswap",
  cpuShares: "cpushares",
  cpuSetCpus: "cpusetcpus",
  cpuPeriod: "cpuperiod",
  cpuQuota: "cpuquota"
} as const

const BuildQuery = Schema.Struct(buildFields).pipe(Schema.encodeKeys(buildKeys))

/** {@link BuildQuery} with the URL of a context the Engine fetches. */
const BuildRemoteQuery = Schema.Struct({ ...buildFields, remote: Schema.String }).pipe(Schema.encodeKeys(buildKeys))

/**
 * A build's messages: progress messages whose `aux` can be any JSON
 * (BuildKit's trace is a string).
 *
 * @internal
 */
export const BuildMessage = Schema.toCodecGoJson(
  DockerSchema.ProgressMessage.mapFields((fields) => ({
    ...fields,
    error: Schema.optionalKey(Schema.String),
    aux: Schema.optionalKey(Schema.Json)
  }))
)

/**
 * The Engine's image endpoints, which `DockerImages` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Images = HttpApiGroup.make("images").add(
  HttpApiEndpoint.get("list", "/images/json", {
    query: Schema.Struct({
      all: Schema.optional(Schema.Boolean),
      filters,
      sharedSize: Schema.optional(Schema.Boolean),
      digests: Schema.optional(Schema.Boolean),
      manifests: Schema.optional(Schema.Boolean),
      identity: Schema.optional(Schema.Boolean)
    }).pipe(Schema.encodeKeys({ sharedSize: "shared-size" })),
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.ImageSummary))
  }).annotate(ApiVersions, { query: { manifests: "1.47", identity: "1.54" } }),
  HttpApiEndpoint.get("inspect", "/images/:name/json", {
    params: name,
    query: { manifests: Schema.optional(Schema.Boolean), platform: Schema.optional(Platform) },
    success: Schema.toCodecGoJson(DockerSchema.ImageInspect)
  }).annotate(ApiVersions, { query: { manifests: "1.48", platform: "1.49" } }),
  HttpApiEndpoint.get("history", "/images/:name/history", {
    params: name,
    query: { platform: Schema.optional(Platform) },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.ImageHistoryResponseItem))
  }).annotate(ApiVersions, { query: { platform: "1.48" } }),
  HttpApiEndpoint.get("attestations", "/images/:name/attestations", {
    params: name,
    query: {
      platform: Schema.optional(Platform),
      type: Schema.optional(Schema.Array(Schema.String)),
      statement: Schema.optional(Schema.Boolean)
    },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.AttestationStatement))
  }).annotate(ApiVersions, { endpoint: "1.55" }),
  HttpApiEndpoint.post("tag", "/images/:name/tag", {
    params: name,
    query: { repo: Schema.String, tag: Schema.optional(Schema.String) },
    success: HttpApiSchema.Empty(201)
  }),
  HttpApiEndpoint.delete("remove", "/images/:name", {
    params: name,
    query: Schema.Struct({
      force: Schema.optional(Schema.Boolean),
      noPrune: Schema.optional(Schema.Boolean),
      platforms: Schema.optional(Schema.Array(Platform))
    }).pipe(Schema.encodeKeys({ noPrune: "noprune" })),
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.ImageDeleteResponseItem))
  }).annotate(ApiVersions, { query: { platforms: "1.50" } }),
  HttpApiEndpoint.post("prune", "/images/prune", {
    query: { filters },
    success: Schema.toCodecGoJson(DockerSchema.ImagePruneResponse)
  }),
  HttpApiEndpoint.get("search", "/images/search", {
    query: { term: Schema.String, limit: Schema.optional(Schema.Number), filters },
    headers: { "x-registry-auth": RegistryAuth },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.ImageSearchResponseItem))
  }),
  HttpApiEndpoint.post("commit", "/commit", {
    query: {
      container: Schema.String,
      repo: Schema.optional(Schema.String),
      tag: Schema.optional(Schema.String),
      comment: Schema.optional(Schema.String),
      author: Schema.optional(Schema.String),
      pause: Schema.optional(Schema.Boolean),
      changes: Schema.optional(Schema.Array(Schema.String))
    },
    payload: DockerSchema.ContainerConfig,
    success: Schema.toCodecGoJson(DockerSchema.IDResponse).pipe(HttpApiSchema.status(201))
  }),
  HttpApiEndpoint.get("distribution", "/distribution/:name/json", {
    params: name,
    headers: { "x-registry-auth": RegistryAuth },
    success: Schema.toCodecGoJson(DockerSchema.DistributionInspect)
  }),
  HttpApiEndpoint.get("save", "/images/:name/get", {
    params: name,
    query: { platform: Schema.optional(Platforms) },
    success: tar
  }).annotate(ApiVersions, { query: { platform: "1.48", "platform.1": "1.52" } }),
  HttpApiEndpoint.get("saveAll", "/images/get", {
    // without names, an archive of no images
    query: { names: Schema.optional(Schema.Array(Schema.String)), platform: Schema.optional(Platforms) },
    success: tar
  }).annotate(ApiVersions, { query: { platform: "1.48", "platform.1": "1.52" } }),
  HttpApiEndpoint.post("load", "/images/load", {
    query: { quiet: Schema.optional(Schema.Boolean), platform: Schema.optional(Platforms) },
    payload: tar,
    success: progress
  }).annotate(ApiVersions, { query: { platform: "1.48", "platform.1": "1.52" } }),
  HttpApiEndpoint.post("pull", "/images/create", {
    // `tag` is a tag or a digest; without one, the Engine pulls every tag
    query: { fromImage: Schema.String, tag: Schema.optional(Schema.String), platform: Schema.optional(Schema.String) },
    headers: { "x-registry-auth": RegistryAuth },
    success: progress
  }),
  HttpApiEndpoint.post("importUrl", "/images/create", {
    query: { fromSrc: Schema.String, ...importQuery },
    success: progress
  }),
  HttpApiEndpoint.post("importArchive", "/images/create", {
    query: { fromSrc: Schema.Literal("-"), ...importQuery },
    payload: tar,
    success: progress
  }),
  HttpApiEndpoint.post("build", "/build", {
    query: BuildQuery,
    headers: { "x-registry-config": Schema.optional(RegistryConfig) },
    payload: tar,
    success: HttpApiSchema.StreamNdjson({ schema: BuildMessage, contentType: "application/json" })
  }),
  HttpApiEndpoint.post("buildRemote", "/build", {
    query: BuildRemoteQuery,
    headers: { "x-registry-config": Schema.optional(RegistryConfig) },
    success: HttpApiSchema.StreamNdjson({ schema: BuildMessage, contentType: "application/json" })
  }),
  HttpApiEndpoint.post("push", "/images/:name/push", {
    params: name,
    query: { tag: Schema.optional(Schema.String), platform: Schema.optional(Platform) },
    headers: { "x-registry-auth": RegistryAuth },
    success: progress
  }).annotate(ApiVersions, { query: { platform: "1.46" } })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// swarm
// -----------------------------------------------------------------------------

const SwarmSecret = Schema.RedactedFromValue(Schema.String)

/**
 * A Swarm, as the Engine's `Swarm`, with the join tokens redacted.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const SwarmInfo = DockerSchema.Swarm.mapFields((fields) => ({
  ...fields,
  JoinTokens: Schema.optionalKey(DockerSchema.JoinTokens.mapFields((fields) => ({
    ...fields,
    Worker: Schema.optionalKey(SwarmSecret),
    Manager: Schema.optionalKey(SwarmSecret)
  })))
}))

/**
 * A Swarm, see {@link SwarmInfo}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type SwarmInfo = typeof SwarmInfo.Type

/**
 * What joining a Swarm takes, as the Engine's `SwarmJoinRequest`, with the join token redacted.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const JoinRequest = DockerSchema.SwarmJoinRequest.mapFields((fields) => ({ ...fields, JoinToken: SwarmSecret }))

/**
 * What joining a Swarm takes, see {@link JoinRequest}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type JoinRequest = typeof JoinRequest.Type

/** The unlock key the Engine answers with, redacted and labelled; a labelled schema only encodes its own label. */
const UnlockKey = Schema.RedactedFromValue(Schema.String, { label: "docker-swarm-unlock-key" })

/**
 * The Engine's Swarm endpoints, which `DockerSwarm` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Swarm = HttpApiGroup.make("swarm").add(
  HttpApiEndpoint.get("inspect", "/swarm", { success: Schema.toCodecGoJson(SwarmInfo) }),
  HttpApiEndpoint.post("init", "/swarm/init", {
    payload: DockerSchema.SwarmInitRequest,
    // the node ID, as a JSON string
    success: Schema.String
  }),
  HttpApiEndpoint.post("join", "/swarm/join", {
    payload: JoinRequest,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("leave", "/swarm/leave", {
    query: { force: Schema.optional(Schema.Boolean) },
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("update", "/swarm/update", {
    query: {
      version: Schema.Number,
      rotateWorkerToken: Schema.optional(Schema.Boolean),
      rotateManagerToken: Schema.optional(Schema.Boolean),
      rotateManagerUnlockKey: Schema.optional(Schema.Boolean)
    },
    payload: DockerSchema.SwarmSpec,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.get("unlockKey", "/swarm/unlockkey", {
    success: Schema.toCodecGoJson(
      DockerSchema.UnlockKeyResponse.mapFields((fields) => ({ ...fields, UnlockKey: Schema.optionalKey(UnlockKey) }))
    )
  }),
  HttpApiEndpoint.post("unlock", "/swarm/unlock", {
    payload: Schema.Struct({ UnlockKey: SwarmSecret }),
    success: HttpApiSchema.Empty(200)
  })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// nodes
// -----------------------------------------------------------------------------

/**
 * The Engine's node endpoints, which `DockerNodes` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Nodes = HttpApiGroup.make("nodes").add(
  HttpApiEndpoint.get("list", "/nodes", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.Node))
  }),
  HttpApiEndpoint.get("inspect", "/nodes/:id", {
    params: id,
    success: Schema.toCodecGoJson(DockerSchema.Node)
  }),
  HttpApiEndpoint.post("update", "/nodes/:id/update", {
    params: id,
    query: { version: Schema.Number },
    payload: DockerSchema.NodeSpec,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.delete("remove", "/nodes/:id", {
    params: id,
    query: { force: Schema.optional(Schema.Boolean) },
    success: HttpApiSchema.Empty(200)
  })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// services
// -----------------------------------------------------------------------------

/** The query of service and task logs. */
const LogsQuery = {
  details: Schema.optional(Schema.Boolean),
  follow: Schema.optional(Schema.Boolean),
  stdout: Schema.optional(Schema.Boolean),
  stderr: Schema.optional(Schema.Boolean),
  since: Schema.optional(UnixSeconds),
  timestamps: Schema.optional(Schema.Boolean),
  tail: Schema.optional(Schema.Union([Schema.Number, Schema.Literal("all")]))
}

/** The fields of a service spec that are newer than API 1.44. */
const serviceSpecVersions = {
  payload: {
    "TaskTemplate.ContainerSpec.OomScoreAdj": "1.46",
    "TaskTemplate.ContainerSpec.Mounts.*.TmpfsOptions.Options": "1.46",
    "TaskTemplate.Resources.SwapBytes": "1.52",
    "TaskTemplate.Resources.MemorySwappiness": "1.52"
  }
}

/**
 * A task's container, as the Engine's `TaskSpec.ContainerSpec`, whose `Env` entries can be `Redacted`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ContainerSpec = DockerSchema.TaskSpec.fields.ContainerSpec.schema.mapFields((fields) => ({
  ...fields,
  Env: Schema.optionalKey(Env)
}))

/**
 * A task's container, see {@link ContainerSpec}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ContainerSpec = typeof ContainerSpec.Type

/**
 * A task's spec, as the Engine's `TaskSpec`, with its {@link ContainerSpec}.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const TaskSpec = DockerSchema.TaskSpec.mapFields((fields) => ({
  ...fields,
  ContainerSpec: Schema.optionalKey(ContainerSpec)
}))

/**
 * A task's spec, see {@link TaskSpec}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type TaskSpec = typeof TaskSpec.Type

/**
 * A service's spec, as the Engine's `ServiceSpec`, with its {@link TaskSpec}.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ServiceSpec = DockerSchema.ServiceSpec.mapFields((fields) => ({
  ...fields,
  TaskTemplate: Schema.optionalKey(TaskSpec)
}))

/**
 * A service's spec, see {@link ServiceSpec}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ServiceSpec = typeof ServiceSpec.Type

const optionalRegistryAuth = { "x-registry-auth": Schema.optional(RegistryAuth) }

/**
 * The Engine's service endpoints, which `DockerServices` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Services = HttpApiGroup.make("services").add(
  HttpApiEndpoint.get("list", "/services", {
    query: { filters, status: Schema.optional(Schema.Boolean) },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.Service))
  }),
  HttpApiEndpoint.get("inspect", "/services/:id", {
    params: id,
    query: { insertDefaults: Schema.optional(Schema.Boolean) },
    success: Schema.toCodecGoJson(DockerSchema.Service)
  }),
  HttpApiEndpoint.post("create", "/services/create", {
    headers: optionalRegistryAuth,
    payload: ServiceSpec,
    success: Schema.toCodecGoJson(DockerSchema.ServiceCreateResponse).pipe(HttpApiSchema.status(201))
  }).annotate(ApiVersions, serviceSpecVersions),
  HttpApiEndpoint.post("update", "/services/:id/update", {
    params: id,
    query: {
      version: Schema.Number,
      registryAuthFrom: Schema.optional(Schema.Literals(["spec", "previous-spec"])),
      rollback: Schema.optional(Schema.Literal("previous"))
    },
    headers: optionalRegistryAuth,
    payload: ServiceSpec,
    success: Schema.toCodecGoJson(DockerSchema.ServiceUpdateResponse)
  }).annotate(ApiVersions, serviceSpecVersions),
  HttpApiEndpoint.delete("remove", "/services/:id", { params: id, success: HttpApiSchema.Empty(200) }),
  HttpApiEndpoint.get("logs", "/services/:id/logs", {
    params: id,
    query: LogsQuery,
    // raw or multiplexed, as the `Content-Type` says
    success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), streamHeaders)
  })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// tasks
// -----------------------------------------------------------------------------

/**
 * The Engine's task endpoints, which `DockerTasks` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Tasks = HttpApiGroup.make("tasks").add(
  HttpApiEndpoint.get("list", "/tasks", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.Task))
  }),
  HttpApiEndpoint.get("inspect", "/tasks/:id", {
    params: id,
    success: Schema.toCodecGoJson(DockerSchema.Task)
  }),
  HttpApiEndpoint.get("logs", "/tasks/:id/logs", {
    params: id,
    query: LogsQuery,
    // raw or multiplexed, as the `Content-Type` says
    success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), streamHeaders)
  })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// secrets
// -----------------------------------------------------------------------------

/**
 * A secret's spec, as the Engine's `SecretSpec`, with `Data` as `Redacted` bytes.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const SecretSpec = DockerSchema.SecretSpec.mapFields((fields) => ({
  ...fields,
  // padded standard base64: the Engine rejects base64url and unpadded data
  Data: Schema.optionalKey(Schema.RedactedFromValue(Schema.Uint8ArrayFromBase64))
}))

/**
 * A secret's spec, see {@link SecretSpec}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type SecretSpec = typeof SecretSpec.Type

/**
 * A secret, as the Engine's `Secret`, with its {@link SecretSpec}.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Secret = DockerSchema.Secret.mapFields((fields) => ({ ...fields, Spec: Schema.optionalKey(SecretSpec) }))

/**
 * A secret, see {@link Secret}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Secret = typeof Secret.Type

/**
 * The Engine's secret endpoints, which `DockerSecrets` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Secrets = HttpApiGroup.make("secrets").add(
  HttpApiEndpoint.get("list", "/secrets", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(Secret))
  }),
  HttpApiEndpoint.get("inspect", "/secrets/:id", {
    params: id,
    success: Schema.toCodecGoJson(Secret)
  }),
  HttpApiEndpoint.post("create", "/secrets/create", {
    payload: SecretSpec,
    success: Schema.toCodecGoJson(DockerSchema.SecretCreateResponse).pipe(HttpApiSchema.status(201))
  }),
  HttpApiEndpoint.post("update", "/secrets/:id/update", {
    params: id,
    query: { version: Schema.Number },
    payload: SecretSpec,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.delete("remove", "/secrets/:id", { params: id, success: HttpApiSchema.NoContent })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// configs
// -----------------------------------------------------------------------------

/**
 * A config's spec, as the Engine's `ConfigSpec`, with `Data` as bytes.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ConfigSpec = DockerSchema.ConfigSpec.mapFields((fields) => ({
  ...fields,
  // padded standard base64: the Engine rejects base64url and unpadded data
  Data: Schema.optionalKey(Schema.Uint8ArrayFromBase64)
}))

/**
 * A config's spec, see {@link ConfigSpec}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ConfigSpec = typeof ConfigSpec.Type

/**
 * A config, as the Engine's `Config`, with its {@link ConfigSpec}.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Config = DockerSchema.Config.mapFields((fields) => ({ ...fields, Spec: Schema.optionalKey(ConfigSpec) }))

/**
 * A config, see {@link Config}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Config = typeof Config.Type

/**
 * The Engine's Swarm config endpoints, which `DockerSwarmConfigs` is a client
 * of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const SwarmConfigs = HttpApiGroup.make("configs").add(
  HttpApiEndpoint.get("list", "/configs", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(Config))
  }),
  HttpApiEndpoint.get("inspect", "/configs/:id", {
    params: id,
    success: Schema.toCodecGoJson(Config)
  }),
  HttpApiEndpoint.post("create", "/configs/create", {
    payload: ConfigSpec,
    success: Schema.toCodecGoJson(DockerSchema.ConfigCreateResponse).pipe(HttpApiSchema.status(201))
  }),
  HttpApiEndpoint.post("update", "/configs/:id/update", {
    params: id,
    query: { version: Schema.Number },
    payload: ConfigSpec,
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.delete("remove", "/configs/:id", { params: id, success: HttpApiSchema.NoContent })
).middleware(SwarmErrors)

// -----------------------------------------------------------------------------
// plugins
// -----------------------------------------------------------------------------

const registryAuth = { "x-registry-auth": RegistryAuth }
/**
 * The privileges a plugin asks for, as the Engine lists them.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Privileges = Schema.Array(DockerSchema.PluginPrivilege)

/**
 * The privileges a plugin asks for, see {@link Privileges}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Privileges = typeof Privileges.Type

/** A pull's or upgrade's progress, with the name of the plugin it installs. */
const installProgress = HttpApiSchema.WithHeaders(progress, {
  "docker-plugin-name": Schema.optional(Schema.String)
})

/**
 * The Engine's plugin endpoints, which `DockerPlugins` is a client of.
 *
 * @stability unstable
 * @category groups
 * @since 4.0.6
 */
export const Plugins = HttpApiGroup.make("plugins").add(
  HttpApiEndpoint.get("list", "/plugins", {
    query: { filters },
    success: Schema.toCodecGoJson(Schema.Array(DockerSchema.Plugin))
  }),
  HttpApiEndpoint.get("privileges", "/plugins/privileges", {
    query: { remote: Schema.String },
    headers: registryAuth,
    success: Schema.toCodecGoJson(Privileges)
  }),
  HttpApiEndpoint.post("pull", "/plugins/pull", {
    query: { remote: Schema.String, name: Schema.optional(Schema.String) },
    headers: registryAuth,
    payload: Privileges,
    success: installProgress
  }),
  HttpApiEndpoint.get("inspect", "/plugins/:name/json", {
    params: name,
    success: Schema.toCodecGoJson(DockerSchema.Plugin)
  }),
  HttpApiEndpoint.delete("remove", "/plugins/:name", {
    params: name,
    query: { force: Schema.optional(Schema.Boolean) },
    // the Engine sends no body, unlike the spec's `Plugin`
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("enable", "/plugins/:name/enable", {
    params: name,
    // required: the Engine fails a request without it
    query: { timeout: Schema.Number },
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("disable", "/plugins/:name/disable", {
    params: name,
    query: { force: Schema.optional(Schema.Boolean) },
    success: HttpApiSchema.Empty(200)
  }),
  HttpApiEndpoint.post("upgrade", "/plugins/:name/upgrade", {
    params: name,
    query: { remote: Schema.String },
    headers: registryAuth,
    payload: Privileges,
    success: installProgress
  }),
  HttpApiEndpoint.post("create", "/plugins/create", {
    query: { name: Schema.String },
    payload: tar,
    success: HttpApiSchema.NoContent
  }),
  HttpApiEndpoint.post("push", "/plugins/:name/push", {
    params: name,
    headers: registryAuth,
    success: progress
  }),
  HttpApiEndpoint.post("set", "/plugins/:name/set", {
    params: name,
    payload: Env,
    success: HttpApiSchema.NoContent
  })
).middleware(EngineErrors)

// -----------------------------------------------------------------------------
// api
// -----------------------------------------------------------------------------

/**
 * The Engine API: every endpoint group.
 *
 * @stability unstable
 * @category api
 * @since 4.0.6
 */
export const DockerApi = HttpApi.make("docker").add(
  System,
  Containers,
  Exec,
  Networks,
  Volumes,
  Images,
  Swarm,
  Nodes,
  Services,
  Tasks,
  Secrets,
  SwarmConfigs,
  Plugins
)
