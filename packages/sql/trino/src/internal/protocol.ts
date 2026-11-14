import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { flow, identity } from "effect/Function"
import * as Headers from "effect/http/Headers"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import type * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import type { Column, TypeArgument, TypeSignature } from "../TrinoTypes.ts"
import {
  DecodeFailure,
  HttpStatusFailure,
  type Operation,
  ProtocolViolation,
  type QueryError,
  QueryFailed,
  type TrinoFailure
} from "./failure.ts"
import { requestFailure, retrying } from "./http.ts"
import * as Json from "./json.ts"

// -----------------------------------------------------------------------------
// Configuration and session
// -----------------------------------------------------------------------------

/** How requests authenticate. Credentials go on every coordinator request, never on spooled segment URIs. */
export type Auth =
  | { readonly _tag: "None" }
  | { readonly _tag: "Basic"; readonly password: Redacted.Redacted<string> }
  | { readonly _tag: "Bearer"; readonly token: Redacted.Redacted<string> }

/** Static per-client settings, built by `TrinoClient` from `TrinoClientConfig`. */
export interface ProtocolConfig {
  readonly url: URL
  readonly user: string
  readonly auth: Auth
  readonly source: string
  readonly clientInfo: string | undefined
  readonly clientTags: ReadonlyArray<string>
  readonly traceToken: string | undefined
  readonly language: string | undefined
  readonly clientCapabilities: ReadonlyArray<string>
  readonly resourceEstimates: ReadonlyMap<string, string>
  readonly extraCredentials: ReadonlyMap<string, Redacted.Redacted<string>>
  readonly encodings: ReadonlyArray<string>
  readonly retry: Schedule.Schedule<unknown, unknown>
  readonly resumeWindow: Duration.Duration
  readonly cancelTimeout: Duration.Duration
  /** Idle time before a `HEAD nextUri` keep-alive; defaults to 30 seconds (the server abandons after `query.client.timeout`, 5 minutes by default). */
  readonly heartbeatInterval?: Duration.Duration | undefined
}

/** A role selection: `ROLE{name}`, `ALL` or `NONE` on the wire. */
export interface SelectedRole {
  readonly type: "ROLE" | "ALL" | "NONE"
  readonly role: string | undefined
}

/** Client-side session state; every statement sends it and the server answers with deltas. */
export interface Session {
  readonly catalog: string | undefined
  readonly schema: string | undefined
  readonly path: string | undefined
  readonly timeZone: string | undefined
  readonly authorizationUser: string | undefined
  readonly properties: ReadonlyMap<string, string>
  readonly roles: ReadonlyMap<string, SelectedRole>
  readonly originalRoles: ReadonlyMap<string, SelectedRole>
  readonly preparedStatements: ReadonlyMap<string, string>
  readonly transactionId: string | undefined
}

export const emptySession: Session = {
  catalog: undefined,
  schema: undefined,
  path: undefined,
  timeZone: undefined,
  authorizationUser: undefined,
  properties: new Map(),
  roles: new Map(),
  originalRoles: new Map(),
  preparedStatements: new Map(),
  transactionId: undefined
}

/** Session changes announced by response headers, applied in arrival order. */
export interface SessionDelta {
  readonly apply: (session: Session) => Session
}

export const noDelta: SessionDelta = { apply: identity }

/** `first`, then `second`. */
export const andThenDelta = (first: SessionDelta, second: SessionDelta): SessionDelta =>
  first === noDelta ? second : second === noDelta ? first : { apply: (session) => second.apply(first.apply(session)) }

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

export interface Segment {
  readonly type: "inline" | "spooled"
  readonly data: string | undefined
  readonly uri: string | undefined
  readonly ackUri: string | undefined
  readonly headers: ReadonlyMap<string, ReadonlyArray<string>>
  readonly metadata: { readonly [key: string]: Json.JsonValue }
}

export type Event =
  | { readonly _tag: "Started"; readonly queryId: string; readonly infoUri: string }
  | { readonly _tag: "Columns"; readonly columns: ReadonlyArray<Column> }
  | { readonly _tag: "Rows"; readonly rows: ReadonlyArray<ReadonlyArray<Json.JsonValue>> }
  | { readonly _tag: "Segments"; readonly encoding: string; readonly segments: ReadonlyArray<Segment> }
  | { readonly _tag: "Finished"; readonly result: Completion }

export interface Completion {
  readonly queryId: string
  readonly updateType: string | undefined
  readonly updateCount: bigint | undefined
  readonly warnings: ReadonlyArray<{ readonly code: string; readonly message: string }>
  readonly delta: SessionDelta
}

/** One decoded `QueryResults` document. */
export interface QueryResults {
  readonly id: string
  readonly infoUri: string
  readonly nextUri: string | undefined
  readonly columns: ReadonlyArray<Column> | undefined
  readonly data: QueryData
  readonly error: QueryError | undefined
  readonly updateType: string | undefined
  readonly updateCount: bigint | undefined
  readonly warnings: ReadonlyArray<{ readonly code: string; readonly message: string }>
  readonly stats: Json.JsonValue
}

export type QueryData =
  | { readonly _tag: "None" }
  | { readonly _tag: "Rows"; readonly rows: ReadonlyArray<ReadonlyArray<Json.JsonValue>> }
  | { readonly _tag: "Segments"; readonly encoding: string; readonly segments: ReadonlyArray<Segment> }

// -----------------------------------------------------------------------------
// Header value codecs
// -----------------------------------------------------------------------------

// The server splits every multi-valued header on "," and "=", then form-decodes
// the value (`java.net.URLDecoder`); `encodeURIComponent` output decodes to the
// same text, and "+" in server output means a space.
const formEncode = (value: string): Result.Result<string, string> => {
  try {
    return Result.succeed(encodeURIComponent(value))
  } catch {
    return Result.fail(`cannot encode header value ${JSON.stringify(value)}`)
  }
}

const formDecode = (value: string): Result.Result<string, string> => {
  try {
    return Result.succeed(decodeURIComponent(value.replace(/\+/g, " ")))
  } catch {
    return Result.fail(`cannot decode header value ${JSON.stringify(value)}`)
  }
}

const printable = /^[\t\x20-\x7e]*$/
// Names the server reads raw before the "=": no separators, no whitespace.
const plainName = /^[^\s=,]+$/

const checkValue = (name: string, value: string): Result.Result<string, string> =>
  printable.test(value) && !value.includes("\r") && !value.includes("\n")
    ? Result.succeed(value)
    : Result.fail(`${name} contains characters that cannot be sent in an HTTP header`)

export const formatRole = (role: SelectedRole): string => role.type === "ROLE" ? `ROLE{${role.role ?? ""}}` : role.type

const rolePattern = /^ROLE\{(.*)\}$/s

export const parseRole = (value: string): Result.Result<SelectedRole, string> => {
  if (value === "ALL" || value === "NONE") {
    return Result.succeed({ type: value, role: undefined })
  }
  const match = rolePattern.exec(value)
  return match === null
    ? Result.fail(`invalid role ${JSON.stringify(value)}`)
    : Result.succeed({ type: "ROLE", role: match[1] })
}

const listValues = (value: string): ReadonlyArray<string> =>
  value.split(",").map((part) => part.trim()).filter((part) => part.length > 0)

const keyValue = (header: string, entry: string): Result.Result<readonly [string, string], string> => {
  const index = entry.indexOf("=")
  return index <= 0
    ? Result.fail(`${header} entry ${JSON.stringify(entry)} is not name=value`)
    : Result.succeed([entry.slice(0, index).trim(), entry.slice(index + 1).trim()])
}

// -----------------------------------------------------------------------------
// Request headers
// -----------------------------------------------------------------------------

const userAgent = "effect-sql-trino"

/** The prefix of every Trino-specific header. */
const PREFIX = "X-Trino-"

/** Checks the credentials the way they are sent; run once when the client is built. */
export const validateAuth = (config: Pick<ProtocolConfig, "auth" | "user">): Result.Result<void, string> => {
  switch (config.auth._tag) {
    case "None":
      return Result.void
    case "Basic":
      return config.user.includes(":")
        ? Result.fail("a user containing \":\" cannot use basic authentication")
        : Result.void
    case "Bearer":
      return /^[\x21-\x7e]+$/.test(Redacted.value(config.auth.token))
        ? Result.void
        : Result.fail("a bearer token must be printable ASCII without spaces")
  }
}

const authenticate = (config: Pick<ProtocolConfig, "auth" | "user">) => {
  switch (config.auth._tag) {
    case "None":
      return identity<HttpClientRequest.HttpClientRequest>
    case "Basic":
      return HttpClientRequest.basicAuth(config.user, config.auth.password)
    case "Bearer":
      return HttpClientRequest.bearerToken(config.auth.token)
  }
}

/**
 * The clients requests go through. Credentials go on every coordinator
 * request, never on spooled segment URIs.
 */
export interface Transport {
  /** Authenticated, with the retry policy: statements, polls, cancels and server info. */
  readonly coordinator: HttpClient.HttpClient
  /** Authenticated, never retried: keep-alives count their own failures. */
  readonly heartbeat: HttpClient.HttpClient
  /** Unauthenticated, with the retry policy: spooled segments and their acknowledgements. */
  readonly segments: HttpClient.HttpClient
}

export const makeTransport = (
  http: HttpClient.HttpClient,
  config: Pick<ProtocolConfig, "auth" | "user" | "retry">
): Transport => {
  const authenticated = http.pipe(
    HttpClient.mapRequest(flow(
      HttpClientRequest.setHeader("User-Agent", userAgent),
      authenticate(config),
      HttpClientRequest.acceptJson
    ))
  )
  return {
    coordinator: retrying(authenticated, config.retry, true),
    heartbeat: authenticated,
    segments: retrying(http, config.retry, false)
  }
}

/** Headers sent on every coordinator request: the identity the statement runs as. */
export const identityHeaders = (
  config: ProtocolConfig,
  session: Session
): Result.Result<Record<string, string>, string> =>
  Result.gen(function*() {
    const headers: Record<string, string> = {}
    headers[`${PREFIX}User`] = yield* checkValue("user", session.authorizationUser ?? config.user)
    headers[`${PREFIX}Original-User`] = yield* checkValue("user", config.user)
    return headers
  })

/** Headers for `POST /v1/statement`: identity plus the whole client session. */
export const statementHeaders = (
  config: ProtocolConfig,
  session: Session
): Result.Result<Record<string, string>, string> =>
  Result.gen(function*() {
    const headers = yield* identityHeaders(config, session)
    const raw = function*(name: string, value: string | undefined) {
      if (value !== undefined && value.length > 0) {
        headers[`${PREFIX}${name}`] = yield* checkValue(name, value)
      }
    }
    const pairs = function*(
      name: string,
      entries: Iterable<readonly [string, string]>,
      encodeName: boolean
    ) {
      const parts: Array<string> = []
      for (const [key, value] of entries) {
        if (!encodeName && !(plainName.test(key) && printable.test(key))) {
          return yield* Result.fail(`${name} name ${JSON.stringify(key)} must not contain whitespace, "=" or ","`)
        }
        const encodedKey = encodeName ? yield* formEncode(key) : key
        parts.push(`${encodedKey}=${yield* formEncode(value)}`)
      }
      if (parts.length > 0) {
        headers[`${PREFIX}${name}`] = parts.join(",")
      }
    }
    const list = function*(name: string, values: ReadonlyArray<string>) {
      for (const value of values) {
        if (value.includes(",")) {
          return yield* Result.fail(`${name} value ${JSON.stringify(value)} must not contain ","`)
        }
      }
      if (values.length > 0) {
        headers[`${PREFIX}${name}`] = yield* checkValue(name, values.join(","))
      }
    }

    yield* raw("Source", config.source)
    yield* raw("Client-Info", config.clientInfo)
    yield* raw("Trace-Token", config.traceToken)
    yield* raw("Language", config.language)
    yield* list("Client-Tags", config.clientTags)
    yield* list("Client-Capabilities", config.clientCapabilities)
    yield* list("Query-Data-Encoding", config.encodings)
    yield* pairs("Resource-Estimate", config.resourceEstimates, false)
    yield* pairs(
      "Extra-Credential",
      Array.from(config.extraCredentials, ([name, value]) => [name, Redacted.value(value)] as const),
      false
    )

    if (session.schema !== undefined && session.catalog === undefined) {
      return yield* Result.fail("a schema cannot be set without a catalog")
    }
    yield* raw("Catalog", session.catalog)
    yield* raw("Schema", session.schema)
    yield* raw("Path", session.path)
    yield* raw("Time-Zone", session.timeZone)
    yield* pairs("Session", session.properties, false)
    yield* pairs("Role", Array.from(session.roles, ([catalog, role]) => [catalog, formatRole(role)] as const), false)
    // The server reads only the first original-roles value (`getFirst`), as one role.
    const originalRole = session.originalRoles.get("system") ?? session.originalRoles.values().next().value
    if (originalRole !== undefined) {
      yield* raw("Original-Roles", formatRole(originalRole))
    }
    yield* pairs("Prepared-Statement", session.preparedStatements, true)
    // Always present: its absence makes the server refuse START TRANSACTION.
    headers[`${PREFIX}Transaction-Id`] = yield* checkValue("transaction id", session.transactionId ?? "NONE")
    return headers
  })

// -----------------------------------------------------------------------------
// Response headers
// -----------------------------------------------------------------------------

type Step = (session: Session) => Session

const setMapEntry = <V>(map: ReadonlyMap<string, V>, key: string, value: V): ReadonlyMap<string, V> =>
  new Map(map).set(key, value)

const deleteMapEntry = <V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> => {
  if (!map.has(key)) return map
  const next = new Map(map)
  next.delete(key)
  return next
}

/**
 * Folds every session-changing response header into a delta. The server repeats
 * them on every executing response, so each directive is an idempotent set.
 * Repeated headers arrive joined with ", "; values that may contain "," are
 * form-encoded by the server.
 */
export const sessionDelta = (
  headers: Headers.Headers
): Result.Result<SessionDelta, string> =>
  Result.gen(function*() {
    const get = (name: string) => Option.getOrUndefined(Headers.get(headers, `${PREFIX}${name}`))
    const steps: Array<Step> = []

    const catalog = get("Set-Catalog")
    if (catalog !== undefined) steps.push((s) => ({ ...s, catalog }))
    const schema = get("Set-Schema")
    if (schema !== undefined) steps.push((s) => ({ ...s, schema }))
    const path = get("Set-Path")
    if (path !== undefined) steps.push((s) => ({ ...s, path }))

    if (get("Clear-Transaction-Id") !== undefined) {
      steps.push((s) => ({ ...s, transactionId: undefined }))
    }
    const started = get("Started-Transaction-Id")
    if (started !== undefined) steps.push((s) => ({ ...s, transactionId: started }))

    const originalRoles: Array<SelectedRole> = []
    for (const value of listValues(get("Set-Original-Roles") ?? "")) {
      originalRoles.push(yield* parseRole(value))
    }
    const authorizationUser = get("Set-Authorization-User")
    if (authorizationUser !== undefined) {
      // Roles belong to the previous identity.
      steps.push((s) => ({ ...s, authorizationUser, roles: new Map() }))
    }
    const lastOriginalRole = originalRoles.at(-1)
    if (lastOriginalRole !== undefined) {
      steps.push((s) => ({ ...s, originalRoles: new Map([["system", lastOriginalRole]]) }))
    }
    if (get("Reset-Authorization-User")?.toLowerCase() === "true") {
      steps.push((s) => ({ ...s, authorizationUser: undefined, roles: new Map(), originalRoles: new Map() }))
    }

    for (const entry of listValues(get("Set-Session") ?? "")) {
      const [name, encoded] = yield* keyValue("Set-Session", entry)
      const value = yield* formDecode(encoded)
      steps.push((s) => ({ ...s, properties: setMapEntry(s.properties, name, value) }))
    }
    for (const name of listValues(get("Clear-Session") ?? "")) {
      steps.push((s) => ({ ...s, properties: deleteMapEntry(s.properties, name) }))
    }

    for (const entry of listValues(get("Set-Role") ?? "")) {
      const [catalog, encoded] = yield* keyValue("Set-Role", entry)
      const role = yield* parseRole(yield* formDecode(encoded))
      steps.push((s) => ({ ...s, roles: setMapEntry(s.roles, catalog, role) }))
    }

    for (const entry of listValues(get("Added-Prepare") ?? "")) {
      const [encodedName, encodedSql] = yield* keyValue("Added-Prepare", entry)
      const name = yield* formDecode(encodedName)
      // May be "$zstd:<base64url>"; echoed back verbatim, the server decodes it.
      const sql = yield* formDecode(encodedSql)
      steps.push((s) => ({ ...s, preparedStatements: setMapEntry(s.preparedStatements, name, sql) }))
    }
    for (const encodedName of listValues(get("Deallocated-Prepare") ?? "")) {
      const name = yield* formDecode(encodedName)
      steps.push((s) => ({ ...s, preparedStatements: deleteMapEntry(s.preparedStatements, name) }))
    }

    return steps.length === 0
      ? noDelta
      : { apply: (session: Session) => steps.reduce((current, step) => step(current), session) }
  })

// -----------------------------------------------------------------------------
// QueryResults decoding
// -----------------------------------------------------------------------------

const integerPattern = /^-?\d+$/

const parseTypeSignature = (value: Json.JsonValue | undefined, at: string): Result.Result<TypeSignature, string> =>
  Result.gen(function*() {
    const rawType = Json.asString(Json.field(value, "rawType"))
    if (rawType === undefined) {
      return yield* Result.fail(`${at}.rawType is missing`)
    }
    const args: Array<TypeArgument> = []
    const raw = Json.field(value, "arguments")
    const list = raw === undefined || raw === null ? [] : Json.asArray(raw)
    if (list === undefined) {
      return yield* Result.fail(`${at}.arguments is not an array`)
    }
    for (let i = 0; i < list.length; i++) {
      args.push(yield* parseTypeArgument(list[i], `${at}.arguments[${i}]`))
    }
    return { rawType, arguments: args }
  })

const parseTypeArgument = (value: Json.JsonValue | undefined, at: string): Result.Result<TypeArgument, string> =>
  Result.gen(function*() {
    const kind = Json.asString(Json.field(value, "kind"))
    const argument = Json.field(value, "value")
    switch (kind) {
      case "TYPE":
      case "TYPE_SIGNATURE":
        return { kind: "TYPE", value: yield* parseTypeSignature(argument, `${at}.value`) }
      case "NAMED_TYPE":
      case "NAMED_TYPE_SIGNATURE":
        return {
          kind: "NAMED_TYPE",
          fieldName: Json.asString(Json.field(Json.field(argument, "fieldName"), "name")),
          value: yield* parseTypeSignature(Json.field(argument, "typeSignature"), `${at}.value.typeSignature`)
        }
      case "LONG":
      case "LONG_LITERAL": {
        const number = Json.asNumber(argument)
        return number === undefined
          ? yield* Result.fail(`${at}.value is not a number`)
          : { kind: "LONG", value: number }
      }
      case "VARIABLE": {
        const variable = Json.asString(argument)
        return variable === undefined
          ? yield* Result.fail(`${at}.value is not a string`)
          : { kind: "VARIABLE", value: variable }
      }
      default:
        return yield* Result.fail(`${at}.kind ${JSON.stringify(kind)} is unknown`)
    }
  })

const parseColumns = (value: Json.JsonValue | undefined): Result.Result<ReadonlyArray<Column> | undefined, string> =>
  Result.gen(function*() {
    if (value === undefined || value === null) return undefined
    const list = Json.asArray(value)
    if (list === undefined) return yield* Result.fail("columns is not an array")
    const columns: Array<Column> = []
    for (let i = 0; i < list.length; i++) {
      const column = list[i]
      const name = Json.asString(Json.field(column, "name"))
      const type = Json.asString(Json.field(column, "type"))
      if (name === undefined || type === undefined) {
        return yield* Result.fail(`columns[${i}] needs a name and a type`)
      }
      const typeSignature = yield* parseTypeSignature(
        Json.field(column, "typeSignature"),
        `columns[${i}].typeSignature`
      )
      columns.push({ name, type, typeSignature })
    }
    return columns
  })

const parseSegment = (value: Json.JsonValue, at: string): Result.Result<Segment, string> =>
  Result.gen(function*() {
    const type = Json.asString(Json.field(value, "type"))
    if (type !== "inline" && type !== "spooled") {
      return yield* Result.fail(`${at}.type ${JSON.stringify(type)} is unknown`)
    }
    const metadata = Json.asObject(Json.field(value, "metadata"))
    if (metadata === undefined) return yield* Result.fail(`${at}.metadata is missing`)
    const headers = new Map<string, ReadonlyArray<string>>()
    const rawHeaders = Json.field(value, "headers")
    if (rawHeaders !== undefined && rawHeaders !== null) {
      const object = Json.asObject(rawHeaders)
      if (object === undefined) return yield* Result.fail(`${at}.headers is not an object`)
      for (const [name, values] of Object.entries(object)) {
        const list = Json.asArray(values)
        const strings = list?.map(Json.asString)
        if (strings === undefined || strings.some((entry) => entry === undefined)) {
          return yield* Result.fail(`${at}.headers.${name} is not a list of strings`)
        }
        headers.set(name, strings.filter((entry): entry is string => entry !== undefined))
      }
    }
    const segment: Segment = {
      type,
      data: Json.asString(Json.field(value, "data")),
      uri: Json.asString(Json.field(value, "uri")),
      ackUri: Json.asString(Json.field(value, "ackUri")),
      headers,
      metadata
    }
    if (type === "inline" && segment.data === undefined) return yield* Result.fail(`${at}.data is missing`)
    if (type === "spooled" && (segment.uri === undefined || segment.ackUri === undefined)) {
      return yield* Result.fail(`${at} needs uri and ackUri`)
    }
    return segment
  })

const parseData = (value: Json.JsonValue | undefined): Result.Result<QueryData, string> =>
  Result.gen(function*() {
    if (value === undefined || value === null) return { _tag: "None" } as const
    const list = Json.asArray(value)
    if (list !== undefined) {
      const rows: Array<ReadonlyArray<Json.JsonValue>> = []
      for (let i = 0; i < list.length; i++) {
        const row = Json.asArray(list[i])
        if (row === undefined) return yield* Result.fail(`data[${i}] is not an array`)
        rows.push(row)
      }
      return rows.length === 0 ? { _tag: "None" } as const : { _tag: "Rows", rows } as const
    }
    const encoding = Json.asString(Json.field(value, "encoding"))
    const rawSegments = Json.asArray(Json.field(value, "segments"))
    if (encoding === undefined || rawSegments === undefined) {
      return yield* Result.fail("data is neither rows nor an encoded {encoding, segments} object")
    }
    const segments: Array<Segment> = []
    for (let i = 0; i < rawSegments.length; i++) {
      segments.push(yield* parseSegment(rawSegments[i], `data.segments[${i}]`))
    }
    return segments.length === 0 ? { _tag: "None" } as const : { _tag: "Segments", encoding, segments } as const
  })

const parseQueryError = (value: Json.JsonValue | undefined): Result.Result<QueryError | undefined, string> =>
  Result.gen(function*() {
    if (value === undefined || value === null) return undefined
    const message = Json.asString(Json.field(value, "message"))
    const errorCode = Json.asNumber(Json.field(value, "errorCode"))
    const errorName = Json.asString(Json.field(value, "errorName"))
    const errorType = Json.asString(Json.field(value, "errorType"))
    if (message === undefined || errorCode === undefined || errorName === undefined || errorType === undefined) {
      return yield* Result.fail("error needs message, errorCode, errorName and errorType")
    }
    const location = Json.field(value, "errorLocation")
    const lineNumber = Json.asNumber(Json.field(location, "lineNumber"))
    const columnNumber = Json.asNumber(Json.field(location, "columnNumber"))
    return {
      message,
      sqlState: Json.asString(Json.field(value, "sqlState")),
      errorCode,
      errorName,
      errorType,
      errorLocation: lineNumber !== undefined && columnNumber !== undefined ? { lineNumber, columnNumber } : undefined,
      failureInfo: Json.field(value, "failureInfo")
    }
  })

const parseWarnings = (
  value: Json.JsonValue | undefined
): ReadonlyArray<{ readonly code: string; readonly message: string }> =>
  (Json.asArray(value) ?? []).map((warning) => {
    const code = Json.field(warning, "warningCode")
    return {
      code: Json.asString(Json.field(code, "name")) ?? String(Json.asNumber(Json.field(code, "code")) ?? "UNKNOWN"),
      message: Json.asString(Json.field(warning, "message")) ?? ""
    }
  })

const parseUpdateCount = (value: Json.JsonValue | undefined): Result.Result<bigint | undefined, string> => {
  if (value === undefined || value === null) return Result.succeed(undefined)
  return value instanceof Json.JsonNumber && integerPattern.test(value.source)
    ? Result.succeed(BigInt(value.source))
    : Result.fail("updateCount is not an integer")
}

/** Decodes one `QueryResults` document. */
export const parseQueryResults = (value: Json.JsonValue): Result.Result<QueryResults, string> =>
  Result.gen(function*() {
    const id = Json.asString(Json.field(value, "id"))
    const infoUri = Json.asString(Json.field(value, "infoUri"))
    if (id === undefined || infoUri === undefined) {
      return yield* Result.fail("QueryResults needs id and infoUri")
    }
    const nextUri = Json.field(value, "nextUri")
    if (nextUri !== undefined && nextUri !== null && typeof nextUri !== "string") {
      return yield* Result.fail("nextUri is not a string")
    }
    const stats = Json.field(value, "stats")
    if (stats === undefined) return yield* Result.fail("QueryResults needs stats")
    const columns = yield* parseColumns(Json.field(value, "columns"))
    const data = yield* parseData(Json.field(value, "data"))
    if (data._tag !== "None" && columns === undefined) {
      return yield* Result.fail("data present without columns")
    }
    return {
      id,
      infoUri,
      nextUri: typeof nextUri === "string" ? nextUri : undefined,
      columns,
      data,
      error: yield* parseQueryError(Json.field(value, "error")),
      updateType: Json.asString(Json.field(value, "updateType")),
      updateCount: yield* parseUpdateCount(Json.field(value, "updateCount")),
      warnings: parseWarnings(Json.field(value, "warnings")),
      stats
    }
  })

// -----------------------------------------------------------------------------
// HTTP with retry
// -----------------------------------------------------------------------------

interface Reply {
  readonly status: number
  readonly headers: Headers.Headers
  readonly body: string
}

/** Sends a request through a client with the retry policy and reads its reply. */
const send = (
  http: HttpClient.HttpClient,
  request: HttpClientRequest.HttpClientRequest,
  operation: Operation
): Effect.Effect<Reply, TrinoFailure> =>
  http.execute(request).pipe(
    Effect.flatMap((response) =>
      Effect.map(response.text, (body): Reply => ({ status: response.status, headers: response.headers, body }))
    ),
    Effect.catch((error) => Effect.flatMap(requestFailure(error, operation), Effect.fail))
  )

interface Page {
  readonly results: QueryResults
  readonly delta: SessionDelta
}

const decodePage = (reply: Reply, operation: Operation): Result.Result<Page, TrinoFailure> =>
  Result.gen(function*() {
    if (reply.status !== 200) {
      return yield* Result.fail(new HttpStatusFailure({ status: reply.status, body: reply.body, operation }))
    }
    const json = Json.parse(reply.body)
    if (Result.isFailure(json)) {
      return yield* Result.fail(
        new DecodeFailure({
          message: `invalid QueryResults JSON: ${json.failure.message}`,
          column: undefined,
          cause: json.failure
        })
      )
    }
    const results = parseQueryResults(json.success)
    if (Result.isFailure(results)) {
      return yield* Result.fail(new ProtocolViolation({ message: results.failure, operation }))
    }
    const delta = sessionDelta(reply.headers)
    if (Result.isFailure(delta)) {
      return yield* Result.fail(new ProtocolViolation({ message: delta.failure, operation }))
    }
    return { results: results.success, delta: delta.success }
  })

const statementUrl = (base: URL, path: string): string => {
  const url = new URL(base.href)
  // Keep a path prefix (gateways mount Trino under one); drop query and fragment.
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`
  url.search = ""
  url.hash = ""
  return url.href
}

// -----------------------------------------------------------------------------
// Statement execution
// -----------------------------------------------------------------------------

/**
 * Failures meaning the cluster is not ready yet (no nodes, starting, shutting
 * down, or the dispatcher's `query-manager.required-workers` wait gave up): the
 * statement was never scheduled, so it is resubmitted inside the resume window,
 * and after it the failure is a connection error. The single list the engine,
 * the error mapping and the docs refer to.
 *
 * Trino up to 476 picks the nodes for a catalog's bucketed stage per catalog
 * (`NodePartitioningManager.getAllNodes(session, catalogHandle)`); while a
 * node's catalog set is momentarily unknown that list is empty and scheduling
 * throws `IllegalArgumentException("nodes is empty")`, reported as
 * GENERIC_INTERNAL_ERROR. It is NO_NODES_AVAILABLE under another name, raised
 * before any task runs. 484 selects from all active nodes (`getAllNodes(session)`).
 * Other 476 reports of the same message: https://github.com/trinodb/trino/discussions/26034
 * (no upstream issue tracks the start-up race).
 */
export const notReadyErrors: ReadonlyArray<{ readonly errorName: string; readonly messagePrefix?: string }> = [
  { errorName: "NO_NODES_AVAILABLE" },
  { errorName: "SERVER_STARTING_UP" },
  { errorName: "SERVER_SHUTTING_DOWN" },
  { errorName: "GENERIC_INSUFFICIENT_RESOURCES", messagePrefix: "Insufficient active worker nodes" },
  { errorName: "GENERIC_INTERNAL_ERROR", messagePrefix: "nodes is empty" }
]

export const isNotReady = (error: QueryError): boolean =>
  notReadyErrors.some((entry) =>
    entry.errorName === error.errorName &&
    (entry.messagePrefix === undefined || error.message.startsWith(entry.messagePrefix))
  )

export const defaultHeartbeatInterval: Duration.Duration = Duration.seconds(30)

const resubmitDelay = (resubmits: number): Duration.Duration =>
  Duration.millis(Math.min(1_000 * 2 ** resubmits, 10_000))

type Next =
  | { readonly _tag: "Submit" }
  | { readonly _tag: "Resubmit"; readonly delay: Duration.Duration }
  | { readonly _tag: "Poll"; readonly uri: string }

interface Run {
  /** The nextUri to GET (and DELETE on cancel). */
  current: string | undefined
  /** The in-flight POST, kept so a cancel can wait for its nextUri. */
  pendingPost: Fiber.Fiber<Page, TrinoFailure> | undefined
  finished: boolean
  queryId: string | undefined
  columnsSent: boolean
  dataSent: boolean
  delta: SessionDelta
  firstSubmitAt: number | undefined
  resubmits: number
  inFlight: boolean
  lastRequestAt: number
}

/**
 * Runs one statement as a stream of protocol events.
 *
 * - POSTs, then follows `nextUri` (queued and executing alike) until it is absent.
 * - Retries every request per `config.retry` (transport failures, 429 honouring
 *   `Retry-After`, 502, 503, 504), the POST included: the coordinator dispatches a
 *   statement only on the first GET of its queued `nextUri`, so a POST whose answer
 *   was lost leaves at most an undispatched QUEUED entry that never runs and is
 *   purged after `query.client.timeout`; it is never executed twice. A failed
 *   nextUri GET is retried on the same URI, never by re-POSTing.
 * - Resubmits on {@link notReadyErrors} while nothing was emitted, the session
 *   is not in an explicit transaction (the failure aborted it, so a resubmit
 *   could only fail with TRANSACTION_ALREADY_ABORTED), and `config.resumeWindow`
 *   allows; each submission emits its own `Started` (the last one is the live query).
 * - Fails with `QueryFailed` when `QueryResults.error` is present; its `delta`
 *   holds the session headers seen so far (a failed COMMIT still clears the transaction).
 * - On interruption or early termination before `Finished`, DELETEs the current
 *   `nextUri`, first waiting for an in-flight POST; bounded by `config.cancelTimeout`.
 * - Sends `HEAD nextUri` while the consumer is idle, so a paused stream is not abandoned.
 */
export const execute = (options: {
  readonly transport: Transport
  readonly config: ProtocolConfig
  readonly session: Session
  readonly statement: string
}): Stream.Stream<Event, TrinoFailure> =>
  Stream.unwrap(Effect.gen(function*() {
    const { config, session, statement, transport } = options
    const postHeaders = statementHeaders(config, session)
    if (Result.isFailure(postHeaders)) {
      return yield* new ProtocolViolation({ message: postHeaders.failure, operation: "execute" })
    }
    const followHeaders = identityHeaders(config, session)
    if (Result.isFailure(followHeaders)) {
      return yield* new ProtocolViolation({ message: followHeaders.failure, operation: "execute" })
    }

    const run: Run = {
      current: undefined,
      pendingPost: undefined,
      finished: false,
      queryId: undefined,
      columnsSent: false,
      dataSent: false,
      delta: noDelta,
      firstSubmitAt: undefined,
      resubmits: 0,
      inFlight: false,
      lastRequestAt: yield* Clock.currentTimeMillis
    }

    // nextUri carries the session's credentials; it must stay on the coordinator's origin.
    const sameOrigin = (uri: string) => URL.canParse(uri) && new URL(uri).origin === config.url.origin

    const tracked = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
      Effect.suspend(() => {
        run.inFlight = true
        return effect
      }).pipe(
        Effect.ensuring(Effect.flatMap(Clock.currentTimeMillis, (now) =>
          Effect.sync(() => {
            run.inFlight = false
            run.lastRequestAt = now
          })))
      )

    const post = send(
      transport.coordinator,
      HttpClientRequest.post(statementUrl(config.url, "/v1/statement")).pipe(
        HttpClientRequest.setHeaders(postHeaders.success),
        HttpClientRequest.bodyText(statement, "text/plain; charset=utf-8")
      ),
      "execute"
    ).pipe(
      Effect.flatMap((reply) => Effect.fromResult(decodePage(reply, "execute")))
    )

    const poll = (uri: string) =>
      send(
        transport.coordinator,
        HttpClientRequest.get(uri).pipe(HttpClientRequest.setHeaders(followHeaders.success)),
        "poll"
      ).pipe(
        Effect.flatMap((reply) => Effect.fromResult(decodePage(reply, "poll")))
      )

    // The POST runs detached so an interruption still learns its nextUri and can cancel it.
    const submit = Effect.gen(function*() {
      const now = yield* Clock.currentTimeMillis
      if (run.firstSubmitAt === undefined) run.firstSubmitAt = now
      run.delta = noDelta
      const fiber = yield* Effect.forkDetach(tracked(post))
      run.pendingPost = fiber
      const page = yield* Fiber.join(fiber)
      run.pendingPost = undefined
      return page
    })

    const handle = Effect.fnUntraced(function*(page: Page) {
      const { results } = page
      run.delta = andThenDelta(run.delta, page.delta)
      if (results.nextUri !== undefined && !sameOrigin(results.nextUri)) {
        run.finished = true
        return yield* new ProtocolViolation({
          message: `nextUri ${results.nextUri} leaves the coordinator origin ${config.url.origin}`,
          operation: "poll"
        })
      }
      run.current = results.nextUri
      const events: Array<Event> = []
      if (run.queryId !== results.id) {
        run.queryId = results.id
        events.push({ _tag: "Started", queryId: results.id, infoUri: results.infoUri })
      }
      if (!run.columnsSent && results.columns !== undefined) {
        run.columnsSent = true
        events.push({ _tag: "Columns", columns: results.columns })
      }
      if (results.data._tag === "Rows") {
        run.dataSent = true
        events.push({ _tag: "Rows", rows: results.data.rows })
      } else if (results.data._tag === "Segments") {
        run.dataSent = true
        events.push({ _tag: "Segments", encoding: results.data.encoding, segments: results.data.segments })
      }

      if (results.error !== undefined) {
        run.current = undefined
        if (
          isNotReady(results.error) && !run.dataSent && session.transactionId === undefined &&
          run.firstSubmitAt !== undefined
        ) {
          const delay = resubmitDelay(run.resubmits)
          const elapsed = (yield* Clock.currentTimeMillis) - run.firstSubmitAt
          if (elapsed + Duration.toMillis(delay) <= Duration.toMillis(config.resumeWindow)) {
            run.resubmits++
            return [events, Option.some<Next>({ _tag: "Resubmit", delay })] as const
          }
        }
        run.finished = true
        return yield* new QueryFailed({
          queryId: results.id,
          error: results.error,
          operation: "execute",
          delta: run.delta
        })
      }

      if (results.nextUri !== undefined) {
        return [events, Option.some<Next>({ _tag: "Poll", uri: results.nextUri })] as const
      }
      run.finished = true
      events.push({
        _tag: "Finished",
        result: {
          queryId: results.id,
          updateType: results.updateType,
          updateCount: results.updateCount,
          warnings: results.warnings,
          delta: run.delta
        }
      })
      return [events, Option.none<Next>()] as const
    })

    const cancel = Effect.gen(function*() {
      const pending = run.pendingPost
      if (pending !== undefined) {
        const exit = yield* Fiber.await(pending)
        if (
          Exit.isSuccess(exit) && exit.value.results.nextUri !== undefined && sameOrigin(exit.value.results.nextUri)
        ) {
          run.current = exit.value.results.nextUri
        }
      }
      const uri = run.current
      if (uri === undefined) return
      run.current = undefined
      // Retried like any request (a proxy 503 must not leave the query running), within cancelTimeout.
      yield* send(
        transport.coordinator,
        HttpClientRequest.delete(uri).pipe(HttpClientRequest.setHeaders(followHeaders.success)),
        "cancel"
      )
    }).pipe(
      Effect.timeout(config.cancelTimeout),
      Effect.ignore,
      Effect.ensuring(
        Effect.suspend(() => run.pendingPost === undefined ? Effect.void : Fiber.interrupt(run.pendingPost))
      )
    )

    const heartbeat = Effect.gen(function*() {
      const interval = Duration.toMillis(config.heartbeatInterval ?? defaultHeartbeatInterval)
      let failures = 0
      while (failures < 3) {
        const idle = (yield* Clock.currentTimeMillis) - run.lastRequestAt
        if (run.inFlight || run.current === undefined || idle < interval) {
          yield* Effect.sleep(Duration.millis(Math.max(interval - idle, interval / 4)))
          continue
        }
        if (run.finished) return
        const reply = yield* Effect.result(
          transport.heartbeat.execute(
            HttpClientRequest.head(run.current).pipe(HttpClientRequest.setHeaders(followHeaders.success))
          )
        )
        failures = Result.isSuccess(reply) && reply.success.status === 200 ? 0 : failures + 1
        run.lastRequestAt = yield* Clock.currentTimeMillis
      }
    })
    yield* Effect.forkScoped(heartbeat)

    return Stream.paginate<Next, Event, TrinoFailure>({ _tag: "Submit" }, (next) => {
      switch (next._tag) {
        case "Submit":
          return Effect.flatMap(submit, handle)
        case "Resubmit":
          return Effect.sleep(next.delay).pipe(Effect.andThen(submit), Effect.flatMap(handle))
        case "Poll":
          return Effect.flatMap(tracked(poll(next.uri)), handle)
      }
    }).pipe(
      Stream.onExit(() => run.finished ? Effect.void : cancel)
    )
  }))

// -----------------------------------------------------------------------------
// Server info
// -----------------------------------------------------------------------------

/** `GET /v1/info`: the node's version and whether it is still starting up. */
export const serverInfo = (
  transport: Transport,
  config: ProtocolConfig
): Effect.Effect<
  { readonly nodeVersion: string; readonly starting: boolean },
  TrinoFailure
> =>
  Effect.gen(function*() {
    const headers = identityHeaders(config, emptySession)
    if (Result.isFailure(headers)) {
      return yield* new ProtocolViolation({ message: headers.failure, operation: "connect" })
    }
    const reply = yield* send(
      transport.coordinator,
      HttpClientRequest.get(statementUrl(config.url, "/v1/info")).pipe(HttpClientRequest.setHeaders(headers.success)),
      "connect"
    )
    if (reply.status !== 200) {
      return yield* new HttpStatusFailure({ status: reply.status, body: reply.body, operation: "connect" })
    }
    const json = Json.parse(reply.body)
    if (Result.isFailure(json)) {
      return yield* new DecodeFailure({ message: "invalid /v1/info JSON", column: undefined, cause: json.failure })
    }
    const nodeVersion = Json.asString(Json.field(Json.field(json.success, "nodeVersion"), "version"))
    const starting = Json.asBoolean(Json.field(json.success, "starting"))
    if (nodeVersion === undefined || starting === undefined) {
      return yield* new ProtocolViolation({
        message: "/v1/info needs nodeVersion.version and starting",
        operation: "connect"
      })
    }
    return { nodeVersion, starting }
  })
