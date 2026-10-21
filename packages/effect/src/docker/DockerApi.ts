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
 * - Every group declares the Engine's {@link ErrorResponses} with
 *   {@link EngineErrors}.
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
import * as HttpApi from "../http-api/HttpApi.ts"
import * as HttpApiEndpoint from "../http-api/HttpApiEndpoint.ts"
import * as HttpApiGroup from "../http-api/HttpApiGroup.ts"
import * as HttpApiMiddleware from "../http-api/HttpApiMiddleware.ts"
import * as HttpApiSchema from "../http-api/HttpApiSchema.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// annotations
// -----------------------------------------------------------------------------

/**
 * An endpoint annotation: the request fields newer than API 1.44, each with
 * the version it arrived in.
 * A key names a field of the request's `query` or `payload` as the caller
 * passes it, and a dotted key (`HostConfig.Init`) a nested one. The
 * `DockerEngine`'s client fails a request that sets one with
 * `OptionNotSupported` when the negotiated version is older, before anything
 * is sent.
 *
 * @internal
 */
export class ApiVersions extends Context.Service<ApiVersions, {
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
 * The Engine's 400: the request or one of its parameters is invalid.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class BadRequest extends Schema.TaggedError<BadRequest>()("BadRequest", { message: Schema.String }) {}

/**
 * The Engine's 401, its own or a registry's.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", { message: Schema.String }) {}

/**
 * The Engine's 403.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Forbidden extends Schema.TaggedError<Forbidden>()("Forbidden", { message: Schema.String }) {}

/**
 * The Engine's 404: the object doesn't exist, or the Engine has no such route.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", { message: Schema.String }) {}

/**
 * The Engine's 409, for example removing a running container.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Conflict extends Schema.TaggedError<Conflict>()("Conflict", { message: Schema.String }) {}

/**
 * The Engine's 412.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class PreconditionFailed
  extends Schema.TaggedError<PreconditionFailed>()("PreconditionFailed", { message: Schema.String })
{}

/**
 * The Engine's 429, typically a registry's rate limit.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class TooManyRequests
  extends Schema.TaggedError<TooManyRequests>()("TooManyRequests", { message: Schema.String })
{}

/**
 * The Engine's 500.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class ServerError extends Schema.TaggedError<ServerError>()("ServerError", { message: Schema.String }) {}

/**
 * The Engine's 501.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class NotImplemented
  extends Schema.TaggedError<NotImplemented>()("NotImplemented", { message: Schema.String })
{}

/**
 * The Engine's 503; a Swarm endpoint's when the node can't serve Swarm requests.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Unavailable extends Schema.TaggedError<Unavailable>()("Unavailable", { message: Schema.String }) {}

/**
 * The status the Engine answers each of {@link ErrorResponses} with.
 *
 * @internal
 */
export const errorStatus = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  PreconditionFailed: 412,
  TooManyRequests: 429,
  ServerError: 500,
  NotImplemented: 501,
  Unavailable: 503
} as const

/**
 * An error class on the wire: its status, and the Engine's `{ message }`
 * JSON body, decoded as {@link errorMessage} reads it.
 */
const errorResponse = <
  const Tag extends keyof typeof errorStatus,
  S extends Schema.Codec<
    { readonly _tag: Tag; readonly message: string },
    { readonly _tag: Tag; readonly message: string }
  >
>(error: S, tag: Tag) =>
  Schema.String.pipe(
    Schema.decodeTo(
      error,
      SchemaTransformation.transform({
        decode: (body) => ({ _tag: tag, message: errorMessage(body) }),
        encode: ({ message }) => JSON.stringify({ message })
      })
    ),
    HttpApiSchema.asText({ contentType: "application/json" }),
    HttpApiSchema.status(errorStatus[tag])
  )

/**
 * The Engine's error responses, one per status of moby's table: every
 * endpoint can answer each of them, as moby maps its kinds of error to
 * statuses the same way for every handler. Each decodes to its class,
 * which a server handler fails with.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export const ErrorResponses = [
  errorResponse(BadRequest, "BadRequest"),
  errorResponse(Unauthorized, "Unauthorized"),
  errorResponse(Forbidden, "Forbidden"),
  errorResponse(NotFound, "NotFound"),
  errorResponse(Conflict, "Conflict"),
  errorResponse(PreconditionFailed, "PreconditionFailed"),
  errorResponse(TooManyRequests, "TooManyRequests"),
  errorResponse(ServerError, "ServerError"),
  errorResponse(NotImplemented, "NotImplemented"),
  errorResponse(Unavailable, "Unavailable")
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

// -----------------------------------------------------------------------------
// parameters
// -----------------------------------------------------------------------------

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
  System
)
