import * as Config from "../../Config.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Redacted from "../../Redacted.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import type { Endpoint, ResolvedConfig } from "../DockerConfig.ts"

// -----------------------------------------------------------------------------
// API version
// -----------------------------------------------------------------------------

/**
 * The one API version the client speaks: every request is sent at it, and an
 * Engine must serve it. Changing it is a compatibility decision.
 *
 * @internal
 */
export const apiVersion = "1.52"

/**
 * Compares two `major.minor` API versions; a malformed one sorts lowest.
 *
 * @internal
 */
export const compareApiVersions = (a: string, b: string): number => {
  const parse = (version: string) => {
    const match = /^(\d+)\.(\d+)$/.exec(version.trim())
    return match === null ? [0, 0] : [Number(match[1]), Number(match[2])]
  }
  const [majorA, minorA] = parse(a)
  const [majorB, minorB] = parse(b)
  return majorA !== majorB ? majorA - majorB : minorA - minorB
}

/**
 * `DOCKER_API_VERSION`, which may only name {@link apiVersion}: the client
 * selects no other contract.
 *
 * @internal
 */
export const ApiVersionVariable = Schema.String.check(
  Schema.makeFilter((version: string) =>
    version.trim() === apiVersion ||
    `effect/docker speaks Docker Engine API ${apiVersion} only, got ${JSON.stringify(version)}`
  )
)

// -----------------------------------------------------------------------------
// host strings
// -----------------------------------------------------------------------------

/**
 * A TCP Endpoint's `host:port`, an IPv6 host in brackets.
 *
 * @internal
 */
export const hostAndPort = (endpoint: typeof Endpoint.cases.Tcp.Type): string =>
  `${endpoint.host.includes(":") ? `[${endpoint.host}]` : endpoint.host}:${endpoint.port}`

/**
 * An Endpoint as the Docker CLI writes a host, `unix:///path`,
 * `npipe:////./pipe/name` or `tcp://host:port`, without TLS material: what `parseHost` reads.
 *
 * @internal
 */
export const formatHost = (endpoint: typeof Endpoint.Type): string =>
  endpoint._tag === "Tcp"
    ? `tcp://${hostAndPort(endpoint)}`
    : `${endpoint._tag === "Unix" ? "unix" : "npipe"}://${endpoint.path}`

// -----------------------------------------------------------------------------
// the Docker CLI's files and variables
// -----------------------------------------------------------------------------

// `auth` is base64 `user:password`; empty means unset, as in the CLI
const isBasicAuth = Schema.makeFilter((auth: string) => {
  if (auth === "") return true
  const decoded = Base64.decodeString(auth)
  return (Result.isSuccess(decoded) && decoded.success.includes(":")) ||
    "Expected base64 user:password"
})

/**
 * An entry of `auths` in `config.json` or `DOCKER_AUTH_CONFIG`: `auth`
 * (base64 `user:password`), a username and password, or an identity token.
 * An empty entry marks a registry whose credentials a helper keeps. An `auth`
 * that isn't base64 `user:password` fails decoding, as it fails the CLI's
 * config loading.
 */
const AuthEntry = Schema.Struct({
  auth: Schema.optionalKey(Schema.String.check(isBasicAuth)),
  username: Schema.optionalKey(Schema.String),
  password: Schema.optionalKey(Schema.String),
  identitytoken: Schema.optionalKey(Schema.String)
})

/**
 * The proxy settings of `proxies` in `config.json`.
 *
 * @internal
 */
export const ProxyConfig = Schema.Struct({
  httpProxy: Schema.optionalKey(Schema.String),
  httpsProxy: Schema.optionalKey(Schema.String),
  noProxy: Schema.optionalKey(Schema.String),
  ftpProxy: Schema.optionalKey(Schema.String),
  allProxy: Schema.optionalKey(Schema.String)
})

/**
 * The parts of the Docker CLI's `config.json` the client reads; the JSON of
 * `DOCKER_AUTH_CONFIG` has the same shape.
 *
 * @internal
 */
export const ConfigFile = Schema.Struct({
  currentContext: Schema.optionalKey(Schema.String),
  credsStore: Schema.optionalKey(Schema.String),
  credHelpers: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  auths: Schema.optionalKey(Schema.Record(Schema.String, AuthEntry)),
  HttpHeaders: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  proxies: Schema.optionalKey(Schema.Record(Schema.String, ProxyConfig)),
  detachKeys: Schema.optionalKey(Schema.String)
})

/**
 * The parts of a Docker Context's metadata the client reads,
 * `contexts/meta/<sha256(name)>/meta.json` in the config directory.
 *
 * @internal
 */
export const ContextMeta = Schema.Struct({
  Name: Schema.optionalKey(Schema.String),
  Endpoints: Schema.optionalKey(Schema.Record(
    Schema.String,
    Schema.Struct({
      Host: Schema.optionalKey(Schema.String),
      SkipTLSVerify: Schema.optionalKey(Schema.Boolean)
    })
  ))
})

const parseBoolTrue = ["1", "t", "T", "TRUE", "true", "True"]

/**
 * The environment variables the Docker CLI reads. An empty variable counts as
 * unset, as in the CLI. `DOCKER_BUILDKIT` is read as Go's `strconv.ParseBool`.
 *
 * @internal
 */
export const EnvironmentVariables = Config.all({
  host: Config.option(Config.String("DOCKER_HOST")),
  context: Config.option(Config.String("DOCKER_CONTEXT")),
  tlsVerify: Config.option(Config.String("DOCKER_TLS_VERIFY")),
  tls: Config.option(Config.String("DOCKER_TLS")),
  certPath: Config.option(Config.String("DOCKER_CERT_PATH")),
  apiVersion: Config.option(Config.schema(ApiVersionVariable, "DOCKER_API_VERSION")),
  defaultPlatform: Config.option(Config.String("DOCKER_DEFAULT_PLATFORM")),
  buildKit: Config.option(Config.schema(
    Schema.Literals([...parseBoolTrue, "0", "f", "F", "FALSE", "false", "False"]).pipe(
      Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
          decode: (flag) => parseBoolTrue.includes(flag),
          encode: (enabled) => enabled ? "1" : "0"
        })
      )
    ),
    "DOCKER_BUILDKIT"
  )),
  authConfig: Config.option(Config.schema(Schema.fromJsonString(ConfigFile), "DOCKER_AUTH_CONFIG")),
  config: Config.option(Config.String("DOCKER_CONFIG"))
})

// -----------------------------------------------------------------------------
// proxies
// -----------------------------------------------------------------------------

const proxyNames = [
  ["httpProxy", "HTTP_PROXY"],
  ["httpsProxy", "HTTPS_PROXY"],
  ["noProxy", "NO_PROXY"],
  ["ftpProxy", "FTP_PROXY"],
  ["allProxy", "ALL_PROXY"]
] as const

/**
 * The variables the Docker CLI passes a configured proxy on as, to builds
 * and new containers: each setting as `HTTP_PROXY` and `http_proxy`, and so
 * on.
 *
 * @internal
 */
export const proxyVariables = (proxy: ResolvedConfig["proxy"]): ReadonlyArray<readonly [string, string]> =>
  proxyNames.flatMap(([key, name]) => {
    const value = proxy[key]
    return value === undefined || value === "" ? [] : [[name, value] as const, [name.toLowerCase(), value] as const]
  })

/**
 * A container's `Env` with the proxy variables it doesn't set itself, as
 * `docker create` adds them.
 *
 * @internal
 */
export const withProxyEnv = (
  env: ReadonlyArray<string | Redacted.Redacted<string>> | undefined,
  proxy: ResolvedConfig["proxy"]
): ReadonlyArray<string | Redacted.Redacted<string>> | undefined => {
  const set = new Set(
    (env ?? []).map((entry) => (Redacted.isRedacted(entry) ? Redacted.value(entry) : entry).split("=", 1)[0])
  )
  const added = proxyVariables(proxy).filter(([name]) => !set.has(name)).map(([name, value]) => `${name}=${value}`)
  return added.length === 0 ? env : [...(env ?? []), ...added]
}
