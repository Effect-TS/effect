/**
 * The configuration the client is built from: a {@link ResolvedConfig}, every
 * setting of the Docker CLI that changes what the client sends, as plain data.
 *
 * The {@link DockerConfig} service holds it. As with `effect/cluster`'s
 * `ShardingConfig`, there are two ways to provide it:
 *
 * - {@link layer} takes static values over {@link defaults}, and reads
 *   nothing;
 * - {@link layerFromEnv} reads everything as the Docker CLI does, so "if
 *   `docker ps` reaches an Engine, so do we", with any values you pass
 *   taking precedence. It reads the `DOCKER_*` variables and the files in
 *   `~/.docker` once, when the layer is built, and never runs the `docker`
 *   CLI.
 *
 * An {@link Endpoint} is the address of an Engine (a unix socket or TCP)
 * together with any TLS material needed to reach it. {@link parseHost} reads
 * a Docker host string. Discovery never contacts the Engine and never probes
 * for sockets. Docker Desktop and rootless Docker are found through the
 * Contexts they create.
 *
 * **Example** (A static configuration)
 *
 * ```ts import.meta.vitest
 * import { DockerConfig } from "effect/docker"
 *
 * const ConfigLive = DockerConfig.layer({
 *   endpoint: { _tag: "Tcp", host: "docker.example.com", port: 2376, tls: { verify: true } },
 *   apiVersion: "1.48"
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Crypto from "../Crypto.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as Hex from "../encoding/Hex.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Layer from "../Layer.ts"
import * as Host from "../net/Host.ts"
import * as Option from "../Option.ts"
import * as Path from "../Path.ts"
import type * as PlatformError from "../PlatformError.ts"
import { hasProperty } from "../Predicate.ts"
import * as Redacted from "../Redacted.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as internal from "./internal/config.ts"

// -----------------------------------------------------------------------------
// Endpoint
// -----------------------------------------------------------------------------

/**
 * TLS settings of a TCP Endpoint.
 *
 * **Details**
 *
 * - `verify: false` skips verification of the Engine's certificate (the CLI's
 *   `--tls` without `--tlsverify`).
 * - `ca` is the CA that signed the Engine's certificate; without it, the
 *   runtime's default CAs apply.
 * - `clientCertificate` is the certificate and key the client presents, as a
 *   pair.
 *
 * Each holds PEM contents, not file paths: Discovery reads the files, so the
 * platform layers never touch the file system.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const Tls = Schema.Struct({
  verify: Schema.Boolean,
  ca: Schema.optionalKey(Schema.String),
  clientCertificate: Schema.optionalKey(Schema.Struct({
    cert: Schema.String,
    key: Schema.Redacted(Schema.String)
  }))
})

const isHost = Schema.makeFilter(
  (host: string) => Result.isSuccess(Host.hostFromString(host)) || `Invalid host ${JSON.stringify(host)}`
)

/**
 * The address of an Engine, with any TLS material needed to reach it: a unix
 * socket (`Unix`), a Windows named pipe (`Npipe`), or TCP (`Tcp`), plain or
 * with `tls`.
 *
 * **Details**
 *
 * A named pipe's `path` is written as the Docker CLI writes it, such as
 * `//./pipe/docker_engine`. A `Tcp` host is a domain name or an IP address,
 * and its port is between 1 and 65535. Construct the cases with
 * `Endpoint.cases.Unix.make`, `Endpoint.cases.Npipe.make` and
 * `Endpoint.cases.Tcp.make`, or write them as literals; match them with
 * `Endpoint.match`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const Endpoint = Schema.TaggedUnion({
  Unix: { path: Schema.String },
  Npipe: { path: Schema.String },
  Tcp: {
    host: Schema.String.check(isHost),
    port: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 })),
    tls: Schema.optionalKey(Tls)
  }
})

/**
 * The Docker CLI's default Endpoint on Linux and macOS,
 * `unix:///var/run/docker.sock`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.7
 */
export const defaultEndpoint: typeof Endpoint.cases.Unix.Type = { _tag: "Unix", path: "/var/run/docker.sock" }

/**
 * The Docker CLI's default Endpoint on Windows,
 * `npipe:////./pipe/docker_engine`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.7
 */
export const defaultNpipeEndpoint: typeof Endpoint.cases.Npipe.Type = { _tag: "Npipe", path: "//./pipe/docker_engine" }

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

/**
 * A Docker host string is malformed.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class InvalidHost extends Data.TaggedError("InvalidHost")<{
  readonly host: string
  readonly message: string
}> {}

/**
 * The selected Context doesn't exist in the Docker config directory.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class ContextNotFound extends Data.TaggedError("ContextNotFound")<{
  readonly context: string
}> {
  override get message() {
    return `Docker context "${this.context}" not found`
  }
}

/**
 * The selected Context exists but can't be used: its metadata is malformed or
 * has no docker endpoint.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class InvalidContext extends Data.TaggedError("InvalidContext")<{
  readonly context: string
  readonly message: string
}> {}

/**
 * The Docker host uses a scheme other than `unix://`, `npipe://` and
 * `tcp://`. `fd://` is not supported. `ssh://` isn't yet: it needs an
 * SSH transport, which is planned on top of Effect's SSH client.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class UnsupportedScheme extends Data.TaggedError("UnsupportedScheme")<{
  readonly host: string
  readonly scheme: string
}> {
  override get message() {
    return `Unsupported Docker host scheme "${this.scheme}://" in ${this.host}: only unix://, npipe:// and tcp:// are supported`
  }
}

/**
 * A TLS file couldn't be read: unreadable, or required and missing (the CA
 * when verifying with `DOCKER_TLS_VERIFY`).
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class UnreadableCertificate extends Data.TaggedError("UnreadableCertificate")<{
  readonly path: string
  readonly cause: unknown
}> {
  override get message() {
    return `Unable to read TLS material from ${this.path}`
  }
}

/**
 * The configuration is invalid: an Endpoint with a bad host or port, an API
 * version pin that is malformed or below the minimum, 1.44, or a `DOCKER_*`
 * variable that doesn't parse.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class InvalidConfig extends Data.TaggedError("InvalidConfig")<{
  readonly cause: Schema.SchemaError
}> {
  override get message() {
    return `Invalid Docker configuration: ${this.cause.message}`
  }
}

/**
 * The Docker CLI's `config.json` couldn't be read or is malformed.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class InvalidConfigFile extends Data.TaggedError("InvalidConfigFile")<{
  readonly source: string
  readonly cause: PlatformError.PlatformError | Schema.SchemaError
}> {
  override get message() {
    return `Invalid Docker config in ${this.source}: ${this.cause.message}`
  }
}

/**
 * Every reason a {@link DockerConfigError} can carry.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export type DockerConfigErrorReason =
  | InvalidHost
  | ContextNotFound
  | InvalidContext
  | UnsupportedScheme
  | UnreadableCertificate
  | InvalidConfig
  | InvalidConfigFile

const DockerConfigErrorTypeId = "~effect/docker/DockerConfigError"

/**
 * Returns `true` when a value is a `DockerConfigError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.7
 */
export const isDockerConfigError = (u: unknown): u is DockerConfigError => hasProperty(u, DockerConfigErrorTypeId)

/**
 * Discovery or layer configuration failed. It only ever fails building the
 * layer, never an operation.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class DockerConfigError extends Data.TaggedError("DockerConfigError")<{
  readonly reason: DockerConfigErrorReason
}> {
  constructor(props: { readonly reason: DockerConfigErrorReason }) {
    if ("cause" in props.reason) {
      super({ ...props, cause: props.reason.cause } as any)
    } else {
      super(props)
    }
  }

  /**
   * Marks this value as a `DockerConfigError` for runtime guards.
   *
   * @stability unstable
   * @since 4.0.7
   */
  readonly [DockerConfigErrorTypeId] = DockerConfigErrorTypeId

  override get message(): string {
    return this.reason.message
  }
}

// -----------------------------------------------------------------------------
// host strings
// -----------------------------------------------------------------------------

/**
 * Parses a Docker host string (`DOCKER_HOST`, `-H`) into an Endpoint, with the
 * Docker CLI's defaults. It's pure: nothing is read.
 *
 * **Details**
 *
 * - An empty string means `unix:///var/run/docker.sock`, the default on
 *   Linux and macOS; {@link layerFromEnv} applies the platform's default.
 * - `unix:///path`; an empty path means `/var/run/docker.sock`.
 * - `npipe:////./pipe/name`, a Windows named pipe; an empty path means
 *   `//./pipe/docker_engine`.
 * - `tcp://host:port`, or `host:port` without a scheme. The port defaults to
 *   2375 and the host to `localhost`, as in the CLI. The host must be a
 *   domain name or an IP address, and the port between 1 and 65535.
 * - `ssh://`, `fd://` and any other scheme fail with
 *   `UnsupportedScheme`.
 *
 * A host string carries no TLS settings: add `tls` to a `Tcp` Endpoint
 * yourself, or let Discovery read them.
 *
 * **Example** (Parsing a TCP host)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { DockerConfig } from "effect/docker"
 *
 * const endpoint = Result.getOrThrow(DockerConfig.parseHost("tcp://docker.example.com:2376"))
 * endpoint // => { _tag: "Tcp", host: "docker.example.com", port: 2376 }
 * ```
 *
 * @stability unstable
 * @category parsing
 * @since 4.0.7
 */
export const parseHost = (host: string): Result.Result<typeof Endpoint.Type, DockerConfigError> => {
  const invalid = (reason: DockerConfigErrorReason) => Result.fail(new DockerConfigError({ reason }))
  const value = host.trim()
  if (value === "") return Result.succeed(defaultEndpoint)
  const separator = value.indexOf("://")
  const scheme = separator === -1 ? "tcp" : value.slice(0, separator).toLowerCase()
  const address = separator === -1 ? value : value.slice(separator + 3)
  if (scheme === "unix") return Result.succeed({ _tag: "Unix", path: address === "" ? defaultEndpoint.path : address })
  if (scheme === "npipe") {
    return Result.succeed({ _tag: "Npipe", path: address === "" ? defaultNpipeEndpoint.path : address })
  }
  if (scheme !== "tcp") return invalid(new UnsupportedScheme({ host: value, scheme }))
  let url: URL
  try {
    url = new URL(`tcp://${address.startsWith(":") ? `localhost${address}` : address}`)
  } catch {
    return invalid(new InvalidHost({ host: value, message: `Invalid Docker host ${value}` }))
  }
  if (url.pathname !== "" && url.pathname !== "/") {
    return invalid(
      new InvalidHost({ host: value, message: `Docker hosts with a base path are not supported: ${value}` })
    )
  }
  if (url.username !== "" || url.search !== "" || url.hash !== "") {
    return invalid(new InvalidHost({ host: value, message: `Invalid Docker host ${value}` }))
  }
  const hostname = url.hostname === "" ? "localhost" : url.hostname.replace(/^\[(.*)\]$/, "$1")
  const port = url.port === "" ? 2375 : Number(url.port)
  if (port === 0 || Result.isFailure(Host.hostFromString(hostname))) {
    return invalid(new InvalidHost({ host: value, message: `Invalid Docker host ${value}` }))
  }
  return Result.succeed({ _tag: "Tcp", host: hostname, port })
}

/**
 * The proxy settings the Docker CLI passes on to builds and containers, from
 * `proxies` in `config.json`: the entry for the Endpoint's host, otherwise
 * `default`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const ProxyConfig = internal.ProxyConfig

/**
 * An API version pin: `major.minor`, at least 1.44, the oldest version the
 * client speaks.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const ApiVersion = internal.ApiVersion

// -----------------------------------------------------------------------------
// registry credentials
// -----------------------------------------------------------------------------

/**
 * The credentials for one registry: a username and password, or an identity
 * token. All three absent means anonymous.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const Credential = Schema.Struct({
  username: Schema.optionalKey(Schema.String),
  password: Schema.optionalKey(Schema.Redacted(Schema.String)),
  identityToken: Schema.optionalKey(Schema.Redacted(Schema.String))
})

/**
 * The credentials for one registry: a username and password, or an identity
 * token.
 *
 * @stability unstable
 * @category models
 * @since 4.0.7
 */
export type Credential = typeof Credential.Type

/**
 * Normalizes a registry as the Docker CLI does: `docker.io`,
 * `index.docker.io` and `registry-1.docker.io` (with or without a scheme)
 * become `https://index.docker.io/v1/`; anything else becomes its host name
 * (with port), without scheme or path.
 *
 * @stability unstable
 * @category utilities
 * @since 4.0.7
 */
export const normalizeRegistry = (registry: string): string => {
  const host = registry.replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "").toLowerCase()
  return host === "docker.io" || host === "index.docker.io" || host === "registry-1.docker.io"
    ? "https://index.docker.io/v1/"
    : host
}

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * A resolved configuration: every setting of the Docker CLI that changes what
 * the client sends, as plain data. A `DockerEngine` is built from it and
 * carries it as its `config`; it never changes for the engine's lifetime.
 *
 * **Details**
 *
 * - `endpoint`: where the Engine is.
 * - `apiVersion`: pins the API version (`major.minor`, at least 1.44) and
 *   turns negotiation off. `undefined` negotiates.
 * - `authConfig`, `auths`, `credsStore`, `credHelpers`: where registry
 *   credentials come from, in the Docker CLI's order: the `auths` of
 *   `DOCKER_AUTH_CONFIG`, then the registry's helper in `credHelpers`, then
 *   the `credsStore` helper, then `auths` of `config.json`. Keys are
 *   registries as written; they are matched with {@link normalizeRegistry}.
 *   The client runs the helpers; the configuration only names them.
 * - `httpHeaders`: sent with every request, unless the request sets the same
 *   header.
 * - `proxy`: passed to builds as build args and to new containers as
 *   environment variables (`HTTP_PROXY` and `http_proxy`, and so on), unless
 *   the call sets them.
 * - `platform`: the default `platform` of pull, import, build and container
 *   create.
 * - `builder`: the default `builder` of builds.
 * - `detachKeys`: the default `detachKeys` of attach and exec.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.7
 */
export const ResolvedConfig = Schema.Struct({
  endpoint: Endpoint,
  apiVersion: Schema.UndefinedOr(ApiVersion),
  authConfig: Schema.Record(Schema.String, Credential),
  auths: Schema.Record(Schema.String, Credential),
  credsStore: Schema.UndefinedOr(Schema.String),
  credHelpers: Schema.Record(Schema.String, Schema.String),
  httpHeaders: Schema.Record(Schema.String, Schema.String),
  proxy: ProxyConfig,
  platform: Schema.UndefinedOr(Schema.String),
  builder: Schema.UndefinedOr(Schema.Literals(["classic", "buildkit"])),
  detachKeys: Schema.UndefinedOr(Schema.String)
})

/**
 * A resolved configuration, see {@link ResolvedConfig}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.7
 */
export type ResolvedConfig = typeof ResolvedConfig.Type

/**
 * Loads the {@link ResolvedConfig} a `DockerEngine` is built from. Every
 * service of `effect/docker` then reads it from the engine.
 *
 * **Details**
 *
 * Provide it with {@link layer} or {@link layerFromEnv}. Both validate it,
 * and fail with `InvalidConfig` when it is invalid.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerConfig extends Context.Service<DockerConfig, ResolvedConfig>()("effect/docker/DockerConfig") {}

/**
 * The defaults: {@link defaultEndpoint}, the API version negotiated, no
 * registry credentials, headers, proxy, default platform, builder or detach
 * keys.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.7
 */
export const defaults: ResolvedConfig = {
  endpoint: defaultEndpoint,
  apiVersion: undefined,
  authConfig: {},
  auths: {},
  credsStore: undefined,
  credHelpers: {},
  httpHeaders: {},
  proxy: {},
  platform: undefined,
  builder: undefined,
  detachKeys: undefined
}

/**
 * Provides a `DockerConfig` from static values, merged over {@link defaults}.
 * Nothing is read: `DOCKER_HOST`, Contexts and `config.json` are ignored.
 * Without an `endpoint`, it is {@link defaultEndpoint} on every platform; only
 * {@link layerFromEnv} applies the platform's default.
 *
 * @see {@link layerFromEnv} for configuring the client as the Docker CLI is
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer = (
  config?: Partial<ResolvedConfig> | undefined
): Layer.Layer<DockerConfig, DockerConfigError> =>
  Layer.effect(DockerConfig)(
    Schema.decodeUnknownEffect(ResolvedConfig)({ ...defaults, ...config }).pipe(
      Effect.mapError((cause) => new DockerConfigError({ reason: new InvalidConfig({ cause }) }))
    )
  )

/**
 * Provides a `DockerConfig` as a bare `docker` invocation configures itself:
 * the Endpoint from Discovery, and every other setting from the variables and
 * `config.json` the Docker CLI reads.
 *
 * **Details**
 *
 * It reads the same variables and files as the `docker` CLI, and never runs
 * it. Discovery checks, in order:
 *
 * 1. `DOCKER_HOST`, with `DOCKER_TLS_VERIFY` (any non-empty value means TLS
 *    with verification), `DOCKER_TLS` (TLS without verification), and the
 *    certificates `ca.pem`, `cert.pem` and `key.pem` from `DOCKER_CERT_PATH`,
 *    by default the config directory;
 * 2. `DOCKER_CONTEXT`, a named Context, as `docker --context` reads it: its
 *    metadata in `contexts/meta/<sha256(name)>/meta.json` in the config
 *    directory (missing: `ContextNotFound`; malformed: `InvalidContext`), its
 *    TLS material in `contexts/tls/<sha256(name)>/docker/*.pem` (that
 *    directory turns TLS on, and `SkipTLSVerify` turns verification off);
 *    `"default"` means `DOCKER_HOST`, or the default Endpoint;
 * 3. `currentContext` in `$DOCKER_CONFIG/config.json` (default `~/.docker`);
 * 4. the default Endpoint, `options.defaultEndpoint`, by default
 *    {@link defaultEndpoint} (`tcp://localhost:2376` when the TLS variables
 *    are set, on every platform). `NodeDocker.layerFromEnv` passes
 *    {@link defaultNpipeEndpoint} on Windows.
 *
 * TLS follows the CLI: whatever it accepts works here. A lone `cert.pem` or
 * `key.pem` is ignored, with a warning. With `DOCKER_TLS_VERIFY`, a missing
 * `ca.pem` fails with `UnreadableCertificate`. Unlike the CLI, `DOCKER_TLS`
 * without verification doesn't need `ca.pem`.
 *
 * The other settings, see {@link ResolvedConfig}:
 *
 * | Setting | Source |
 * | --- | --- |
 * | `apiVersion` | `DOCKER_API_VERSION` |
 * | `authConfig` | the `auths` of `DOCKER_AUTH_CONFIG` |
 * | `auths`, `credsStore`, `credHelpers` | `config.json` |
 * | `httpHeaders` | `HttpHeaders` in `config.json` |
 * | `proxy` | `proxies` in `config.json`: the entry for the Endpoint's host (`unix:///var/run/docker.sock`, `tcp://host:2376`), otherwise `default` |
 * | `platform` | `DOCKER_DEFAULT_PLATFORM` |
 * | `builder` | `DOCKER_BUILDKIT`: true means `buildkit`, false `classic` |
 * | `detachKeys` | `detachKeys` in `config.json` |
 *
 * The configuration is read once, when the layer is built, and never
 * refreshed. A value given in `overrides` wins, even `undefined`, and the
 * files it would come from are never read: an `endpoint` skips Discovery
 * entirely, like `docker -H`, and overriding every setting of `config.json`
 * skips that file. The variables are always read and validated: one that
 * doesn't parse fails with `InvalidConfig`, even when its setting is
 * overridden. `DOCKER_BUILDKIT` is read as Go's `strconv.ParseBool` does.
 * A malformed `config.json` fails with `InvalidConfigFile`.
 *
 * Environment variables are read through `Config`, so through the current
 * `ConfigProvider`, and files through `FileSystem`. Building the layer never
 * contacts the Engine and doesn't check that the socket exists: an
 * unreachable Engine shows up on the first request, as `ConnectionFailed`.
 *
 * @see {@link layer} for a static configuration
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layerFromEnv = (
  overrides?: Partial<ResolvedConfig> | undefined,
  options?: {
    /** The Endpoint where the CLI falls back to the OS default; by default {@link defaultEndpoint}. */
    readonly defaultEndpoint?: typeof Endpoint.Type | undefined
  }
): Layer.Layer<DockerConfig, DockerConfigError, FileSystem.FileSystem | Path.Path | Crypto.Crypto> =>
  Layer.effect(DockerConfig)(Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const crypto = yield* Crypto.Crypto
    const fail = (reason: DockerConfigErrorReason) => Effect.fail(new DockerConfigError({ reason }))
    // a value given in `overrides` wins, even `undefined`, and the files it would come from are never read
    const given = <K extends keyof ResolvedConfig>(key: K): boolean => overrides !== undefined && key in overrides
    const override = <K extends keyof ResolvedConfig>(key: K) => overrides![key] as ResolvedConfig[K]

    const variables = yield* internal.EnvironmentVariables.pipe(
      Effect.catchTag("ConfigError", (error) =>
        Schema.isSchemaError(error.cause)
          ? fail(new InvalidConfig({ cause: error.cause }))
          : Effect.die(error))
    )
    // the config directory: `DOCKER_CONFIG`, otherwise `~/.docker`
    const dir = Option.isSome(variables.config)
      ? variables.config.value
      : Option.isSome(variables.home)
      ? path.join(variables.home.value, ".docker")
      : undefined
    // `config.json` is read at most once, and only when something needs it; a missing one is `undefined`
    const configFile = yield* Effect.cached(
      Effect.gen(function*() {
        if (dir === undefined) return undefined
        const file = path.join(dir, "config.json")
        const text = yield* fs.readFileString(file).pipe(
          Effect.map(Option.some),
          Effect.catchReason("PlatformError", "NotFound", () => Effect.succeedNone)
        )
        return Option.isNone(text)
          ? undefined
          : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(internal.ConfigFile))(text.value)
      }).pipe(
        Effect.catchTags({
          PlatformError: (cause) => fail(new InvalidConfigFile({ source: path.join(dir!, "config.json"), cause })),
          SchemaError: (cause) => fail(new InvalidConfigFile({ source: path.join(dir!, "config.json"), cause }))
        })
      )
    )

    const readPem = Effect.fnUntraced(function*(file: string, required: boolean) {
      return yield* fs.readFileString(file).pipe(
        Effect.map(Option.some),
        Effect.catchReason("PlatformError", "NotFound", (_, error) =>
          required
            ? fail(new UnreadableCertificate({ path: file, cause: error }))
            : Effect.succeedNone),
        Effect.catchTag("PlatformError", (cause) => fail(new UnreadableCertificate({ path: file, cause })))
      )
    })

    // `ca.pem`, `cert.pem` and `key.pem` in `tlsDir`, as in the CLI: a lone `cert.pem` or `key.pem` is
    // ignored, with a warning; `requireCa` makes a missing `ca.pem` fail
    const readTls = Effect.fnUntraced(function*(tlsDir: string, verify: boolean, requireCa: boolean) {
      const ca = yield* readPem(path.join(tlsDir, "ca.pem"), requireCa)
      const cert = yield* readPem(path.join(tlsDir, "cert.pem"), false)
      const key = yield* readPem(path.join(tlsDir, "key.pem"), false)
      if (Option.isSome(cert) !== Option.isSome(key)) {
        const [present, missing] = Option.isSome(cert) ? ["cert.pem", "key.pem"] : ["key.pem", "cert.pem"]
        yield* Effect.logWarning(`Ignoring ${path.join(tlsDir, present)}: a client certificate needs ${missing} too`)
      }
      return {
        verify,
        ...(Option.isSome(ca) ? { ca: ca.value } : {}),
        ...(Option.isSome(cert) && Option.isSome(key)
          ? { clientCertificate: { cert: cert.value, key: Redacted.make(key.value, { label: "docker-tls-key" }) } }
          : {})
      } satisfies typeof Tls.Type
    })

    // a host string with the TLS variables: `DOCKER_TLS_VERIFY` (verify) or `DOCKER_TLS` (don't)
    const fromDockerHost = Effect.fnUntraced(function*(host: string) {
      const verify = Option.isSome(variables.tlsVerify)
      if (!verify && Option.isNone(variables.tls)) {
        return host.trim() === ""
          ? options?.defaultEndpoint ?? defaultEndpoint
          : yield* Effect.fromResult(parseHost(host))
      }
      // TLS without a host means `tcp://localhost:2376`, as in the CLI
      const endpoint: typeof Endpoint.Type = host.trim() === ""
        ? { _tag: "Tcp", host: "localhost", port: 2376 }
        : yield* Effect.fromResult(parseHost(host))
      if (endpoint._tag !== "Tcp") return endpoint
      const certPath = Option.getOrUndefined(variables.certPath) ?? dir
      // the CLI always requires ca.pem here; without verification it would go unused, so it may be missing
      const tls: typeof Tls.Type = certPath === undefined ? { verify } : yield* readTls(certPath, verify, verify)
      return { ...endpoint, tls }
    })

    // a named Context, as `docker --context <name>` reads it
    const fromContext = Effect.fnUntraced(function*(name: string) {
      // the CLI's default Context is `DOCKER_HOST`, or the OS default
      if (name === "default") return yield* fromDockerHost(Option.getOrElse(variables.host, () => ""))
      if (dir === undefined) return yield* fail(new ContextNotFound({ context: name }))
      // a Context's directory is named by the hex SHA-256 of its name
      const hash = Hex.encode(yield* crypto.digest("SHA-256", new TextEncoder().encode(name)).pipe(Effect.orDie))
      const metaFile = path.join(dir, "contexts", "meta", hash, "meta.json")
      const text = yield* fs.readFileString(metaFile).pipe(
        Effect.catchTag("PlatformError", () => fail(new ContextNotFound({ context: name })))
      )
      const meta = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(internal.ContextMeta))(text).pipe(
        Effect.catchTag(
          "SchemaError",
          () => fail(new InvalidContext({ context: name, message: `Malformed Docker context metadata in ${metaFile}` }))
        )
      )
      const docker = meta.Endpoints?.docker
      if (docker?.Host === undefined) {
        return yield* fail(
          new InvalidContext({ context: name, message: `Docker context "${name}" has no docker endpoint` })
        )
      }
      const endpoint = yield* Effect.fromResult(parseHost(docker.Host))
      if (endpoint._tag !== "Tcp") return endpoint
      // as in the CLI, the TLS directory turns TLS on, even an empty one
      const tlsDir = path.join(dir, "contexts", "tls", hash, "docker")
      const hasTlsData = yield* fs.exists(tlsDir).pipe(Effect.orElseSucceed(() => false))
      const skipVerify = docker.SkipTLSVerify === true
      if (!hasTlsData && !skipVerify) return endpoint
      const tls: typeof Tls.Type = hasTlsData ? yield* readTls(tlsDir, !skipVerify, false) : { verify: false }
      return { ...endpoint, tls }
    })

    // Discovery, in the CLI's order: `DOCKER_HOST`, `DOCKER_CONTEXT`, `currentContext`, the default socket
    const discover = Effect.gen(function*() {
      if (Option.isSome(variables.host)) return yield* fromDockerHost(variables.host.value)
      if (Option.isSome(variables.context)) return yield* fromContext(variables.context.value)
      const currentContext = (yield* configFile)?.currentContext
      if (currentContext !== undefined && currentContext !== "") return yield* fromContext(currentContext)
      return yield* fromDockerHost("")
    })

    // `auths` entries as credentials: `auth` (base64 `user:password`), an identity token, or `{}`
    const fromAuths = (auths: typeof internal.ConfigFile.Type["auths"]): Readonly<Record<string, Credential>> =>
      Object.fromEntries(
        Object.entries(auths ?? {}).map(([registry, entry]): [string, Credential] => {
          if (entry.identitytoken !== undefined && entry.identitytoken !== "") {
            return [registry, {
              ...(entry.username !== undefined ? { username: entry.username } : {}),
              identityToken: Redacted.make(entry.identitytoken)
            }]
          }
          if (entry.auth !== undefined && entry.auth !== "") {
            // `ConfigFile` checked that it is base64 `user:password`
            const decoded = Result.getOrThrow(Base64.decodeString(entry.auth))
            const separator = decoded.indexOf(":")
            return [registry, {
              username: decoded.slice(0, separator),
              password: Redacted.make(decoded.slice(separator + 1))
            }]
          }
          if (entry.username !== undefined && entry.password !== undefined) {
            return [registry, { username: entry.username, password: Redacted.make(entry.password) }]
          }
          return [registry, {}]
        })
      )

    const endpoint = given("endpoint") ? override("endpoint") : yield* discover
    const authConfig = given("authConfig")
      ? override("authConfig")
      : fromAuths(Option.getOrUndefined(variables.authConfig)?.auths)
    const builder = given("builder")
      ? override("builder")
      : Option.match(variables.buildKit, {
        onNone: () => undefined,
        onSome: (enabled) => enabled ? "buildkit" as const : "classic" as const
      })
    // `proxies` is keyed by the Docker host string; the CLI ignores empty settings
    const proxies = given("proxy") ? undefined : (yield* configFile)?.proxies
    const proxy = given("proxy") ? override("proxy") : Object.fromEntries(
      Object.entries(proxies?.[internal.formatHost(endpoint)] ?? proxies?.default ?? {}).filter(([, value]) =>
        value !== ""
      )
    )

    return yield* Schema.decodeUnknownEffect(ResolvedConfig)({
      endpoint,
      apiVersion: given("apiVersion") ? override("apiVersion") : Option.getOrUndefined(variables.apiVersion),
      authConfig,
      auths: given("auths") ? override("auths") : fromAuths((yield* configFile)?.auths),
      credsStore: given("credsStore") ? override("credsStore") : (yield* configFile)?.credsStore || undefined,
      credHelpers: given("credHelpers") ? override("credHelpers") : (yield* configFile)?.credHelpers ?? {},
      httpHeaders: given("httpHeaders") ? override("httpHeaders") : (yield* configFile)?.HttpHeaders ?? {},
      proxy,
      platform: given("platform") ? override("platform") : Option.getOrUndefined(variables.defaultPlatform),
      builder,
      detachKeys: given("detachKeys") ? override("detachKeys") : (yield* configFile)?.detachKeys || undefined
    }).pipe(Effect.catchTag("SchemaError", (cause) => fail(new InvalidConfig({ cause }))))
  }))
