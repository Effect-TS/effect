import * as Redacted from "effect/Redacted"
import * as EffectResult from "effect/Result"
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError"

/**
 * Connection settings recovered from a URL. Shared by `MysqlConnection`, which
 * opens the socket, and `MysqlClient`, which reports the address on its spans.
 *
 * @internal
 */
export interface UrlConfig {
  host?: string | undefined
  port?: number | undefined
  database?: string | undefined
  username?: string | undefined
  password?: string | undefined
  ssl?: boolean | undefined
}

/** @internal */
export const configError = (message: string, cause?: unknown): SqlError =>
  new SqlError({
    reason: new ConnectionError({
      cause: cause ?? new Error(message),
      message: `MysqlConnection: ${message}`,
      operation: "connect"
    })
  })

/** @internal */
export const parseUrl = (raw: string): EffectResult.Result<UrlConfig, SqlError> => {
  let url: URL
  try {
    url = new URL(raw)
  } catch (cause) {
    return EffectResult.fail(configError("Invalid connection URL", cause))
  }
  if (url.protocol !== "mysql:" && url.protocol !== "mysqls:") {
    return EffectResult.fail(configError(`Unsupported URL protocol "${url.protocol}"`))
  }
  const config: UrlConfig = {}
  const mutable = config as Record<string, unknown>
  if (url.hostname !== "") {
    // A bracketed IPv6 literal keeps its brackets in `hostname`.
    mutable.host = decodeURIComponent(
      url.hostname.startsWith("[") && url.hostname.endsWith("]")
        ? url.hostname.slice(1, -1)
        : url.hostname
    )
  }
  if (url.port !== "") mutable.port = Number(url.port)
  if (url.username !== "") mutable.username = decodeURIComponent(url.username)
  if (url.password !== "") mutable.password = decodeURIComponent(url.password)
  const database = url.pathname.replace(/^\//, "")
  if (database !== "") mutable.database = decodeURIComponent(database)
  if (url.protocol === "mysqls:") mutable.ssl = true
  const ssl = url.searchParams.get("ssl")
  if (ssl !== null) mutable.ssl = ssl !== "false" && ssl !== "0"
  return EffectResult.succeed(config)
}

/**
 * Where a client is pointed, once explicit settings and a connection URL have
 * been reconciled. Reporting an address should not depend on which of the two
 * the caller used.
 *
 * @internal
 */
export interface Address {
  readonly host: string
  readonly port: number
  readonly username: string | undefined
  readonly password: string | undefined
  readonly database: string | undefined
}

/** @internal */
export interface AddressSource {
  readonly url?: Redacted.Redacted | undefined
  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined
  readonly database?: string | undefined
}

/** @internal */
export const resolveAddress = (config: AddressSource): Address => {
  let url: UrlConfig | undefined
  if (config.url !== undefined) {
    const parsed = parseUrl(Redacted.value(config.url))
    if (EffectResult.isSuccess(parsed)) url = parsed.success
  }
  return {
    host: config.host ?? url?.host ?? "localhost",
    port: config.port ?? url?.port ?? 3306,
    username: config.username ?? url?.username,
    password: config.password !== undefined ? Redacted.value(config.password) : url?.password,
    database: config.database ?? url?.database
  }
}
