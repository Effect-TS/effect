/**
 * Connect protocol internals shared by the server and client.
 *
 * https://connectrpc.com/docs/protocol
 *
 * PROTOTYPE.
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import type * as Rpc from "effect/rpc/Rpc"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import * as RpcSchema from "effect/rpc/RpcSchema"
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"
import { type Code, CodeKey, ServiceName } from "../ConnectRpc.ts"
import { getAnnotation } from "./annotations.ts"
import * as Binary from "./binary.ts"
import * as Json from "./json.ts"
import * as Layout from "./layout.ts"
import { base64Decode, base64Encode } from "./wire.ts"

// -----------------------------------------------------------------------------
// codes
// -----------------------------------------------------------------------------

/** @internal */
export const codeToHttpStatus = (code: Code): number => {
  switch (code) {
    case "canceled":
      return 499
    case "unknown":
      return 500
    case "invalid_argument":
      return 400
    case "deadline_exceeded":
      return 504
    case "not_found":
      return 404
    case "already_exists":
      return 409
    case "permission_denied":
      return 403
    case "resource_exhausted":
      return 429
    case "failed_precondition":
      return 400
    case "aborted":
      return 409
    case "out_of_range":
      return 400
    case "unimplemented":
      return 501
    case "internal":
      return 500
    case "unavailable":
      return 503
    case "data_loss":
      return 500
    case "unauthenticated":
      return 401
  }
}

/** @internal */
export const codeFromHttpStatus = (status: number): Code => {
  switch (status) {
    case 400:
      return "internal"
    case 401:
      return "unauthenticated"
    case 403:
      return "permission_denied"
    case 404:
      return "unimplemented"
    case 429:
    case 502:
    case 503:
    case 504:
      return "unavailable"
    default:
      return "unknown"
  }
}

const codes: ReadonlySet<string> = new Set<Code>([
  "canceled",
  "unknown",
  "invalid_argument",
  "deadline_exceeded",
  "not_found",
  "already_exists",
  "permission_denied",
  "resource_exhausted",
  "failed_precondition",
  "aborted",
  "out_of_range",
  "unimplemented",
  "internal",
  "unavailable",
  "data_loss",
  "unauthenticated"
])

/** @internal */
export const isCode = (u: unknown): u is Code => typeof u === "string" && codes.has(u)

// -----------------------------------------------------------------------------
// wire error
// -----------------------------------------------------------------------------

/** @internal */
export interface WireErrorDetail {
  readonly type: string
  readonly value: Uint8Array
  readonly debug?: unknown
}

/** @internal */
export interface WireError {
  readonly code: Code
  readonly message: string
  readonly details: ReadonlyArray<WireErrorDetail>
}

/** @internal */
export const wireErrorToJson = (error: WireError): Record<string, unknown> => {
  const out: Record<string, unknown> = { code: error.code }
  if (error.message.length > 0) out.message = error.message
  if (error.details.length > 0) {
    out.details = error.details.map((d) => ({
      type: d.type,
      value: base64Encode(d.value).replace(/=+$/, ""),
      ...(d.debug !== undefined ? { debug: d.debug } : {})
    }))
  }
  return out
}

/** @internal */
export const wireErrorFromJson = (json: unknown, fallback: Code): WireError => {
  if (typeof json !== "object" || json === null) return { code: fallback, message: "", details: [] }
  const obj = json as Record<string, unknown>
  const details: Array<WireErrorDetail> = []
  if (Array.isArray(obj.details)) {
    for (const d of obj.details) {
      if (typeof d?.type === "string" && typeof d?.value === "string") {
        details.push({ type: d.type, value: base64Decode(d.value), debug: d.debug })
      }
    }
  }
  return {
    code: isCode(obj.code) ? obj.code : fallback,
    message: typeof obj.message === "string" ? obj.message : "",
    details
  }
}

/**
 * The defect a client sees for a Connect error that does not map to one of
 * the rpc's error schemas. Encoded like `Schema.Defect` (a JSON object).
 *
 * @internal
 */
export const wireErrorToDefect = (error: WireError) => ({
  name: "ConnectError",
  message: `[${error.code}] ${error.message}`,
  code: error.code
})

// -----------------------------------------------------------------------------
// envelopes
// -----------------------------------------------------------------------------

/** @internal */
export const FLAG_COMPRESSED = 0b00000001
/** @internal */
export const FLAG_END_STREAM = 0b00000010

/** @internal */
export const envelope = (flags: number, data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(5 + data.length)
  const view = new DataView(out.buffer)
  view.setUint8(0, flags)
  view.setUint32(1, data.length)
  out.set(data, 5)
  return out
}

/** @internal */
export interface Envelope {
  readonly flags: number
  readonly data: Uint8Array
}

/**
 * Incremental envelope parser.
 *
 * @internal
 */
export class EnvelopeDecoder {
  private buffer: Uint8Array = new Uint8Array(0)

  push(chunk: Uint8Array): Array<Envelope> {
    if (this.buffer.length === 0) {
      this.buffer = chunk
    } else {
      const merged = new Uint8Array(this.buffer.length + chunk.length)
      merged.set(this.buffer)
      merged.set(chunk, this.buffer.length)
      this.buffer = merged
    }
    const out: Array<Envelope> = []
    while (this.buffer.length >= 5) {
      const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength)
      const length = view.getUint32(1)
      if (this.buffer.length < 5 + length) break
      out.push({ flags: view.getUint8(0), data: this.buffer.subarray(5, 5 + length) })
      this.buffer = this.buffer.subarray(5 + length)
    }
    return out
  }

  get pending(): number {
    return this.buffer.length
  }
}

// -----------------------------------------------------------------------------
// content types
// -----------------------------------------------------------------------------

/** @internal */
export type Format = "binary" | "json"

/** @internal */
export const parseContentType = (
  contentType: string | undefined
): { readonly stream: boolean; readonly format: Format } | undefined => {
  if (contentType === undefined) return undefined
  const m = /^application\/(connect\+)?(?:(json)(?:; ?charset=utf-?8)?|(proto))$/i.exec(contentType.trim())
  if (m === null) return undefined
  return { stream: m[1] !== undefined, format: m[3] !== undefined ? "binary" : "json" }
}

/** @internal */
export const contentType = (stream: boolean, format: Format): string =>
  `application/${stream ? "connect+" : ""}${format === "binary" ? "proto" : "json"}`

// -----------------------------------------------------------------------------
// methods
// -----------------------------------------------------------------------------

/** @internal */
export interface ErrorCase {
  readonly typeName: string | undefined
  readonly code: Code
  readonly root: Layout.Root | undefined
  readonly guard: (encoded: unknown) => boolean
}

/** @internal */
export interface Method {
  readonly tag: string
  readonly path: string
  readonly stream: boolean
  readonly input: Layout.Root
  readonly output: Layout.Root
  readonly errors: ReadonlyArray<ErrorCase>
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** @internal */
export const encodeMessage = (root: Layout.Root, value: unknown, format: Format): Uint8Array =>
  format === "binary"
    ? Binary.encodeRoot(root, value)
    : textEncoder.encode(JSON.stringify(Json.encodeRootJson(root, value)))

/** @internal */
export const decodeMessage = (root: Layout.Root, bytes: Uint8Array, format: Format): unknown =>
  format === "binary"
    ? Binary.decodeRoot(root, bytes)
    : Json.decodeRootJson(root, bytes.length === 0 ? {} : JSON.parse(textDecoder.decode(bytes)))

/** @internal */
export const decodeJsonBytes = (bytes: Uint8Array): unknown => JSON.parse(textDecoder.decode(bytes))

/** @internal */
export const encodeJsonBytes = (json: unknown): Uint8Array => textEncoder.encode(JSON.stringify(json))

const errorCases = (schema: Schema.Top): Array<ErrorCase> => {
  const members = schema.ast._tag === "Union" ? schema.ast.types : [schema.ast]
  const out: Array<ErrorCase> = []
  for (const member of members) {
    if (member._tag === "Never") continue
    let root: Layout.Root | undefined
    try {
      root = Layout.compileRoot(member)
    } catch {
      root = undefined
    }
    const code = getAnnotation<Code>(member, CodeKey)
    out.push({
      typeName: root?._ === "message" ? root.desc.typeName : undefined,
      code: code ?? "unknown",
      root,
      guard: Schema.is(Schema.make(SchemaAST.toEncoded(member)))
    })
  }
  return out
}

const methodsCache = new WeakMap<RpcGroup.Any, ReadonlyMap<string, Method>>()

/** @internal */
export const methods = (group: RpcGroup.Any, serviceNameOverride?: string): ReadonlyMap<string, Method> => {
  const cached = serviceNameOverride === undefined ? methodsCache.get(group) : undefined
  if (cached) return cached
  const serviceName = serviceNameOverride ?? Option.getOrUndefined(
    Context.getOption((group as RpcGroup.RpcGroup<any>).annotations, ServiceName)
  )
  if (serviceName === undefined) {
    throw new Error("Connect: the RpcGroup needs a ConnectRpc.ServiceName annotation (or a serviceName option)")
  }
  const out = new Map<string, Method>()
  for (const rpc of (group as RpcGroup.RpcGroup<any>).requests.values() as Iterable<Rpc.AnyWithProps>) {
    const streamSchemas = RpcSchema.isStreamSchema(rpc.successSchema)
      ? { success: rpc.successSchema.success, error: rpc.successSchema.error }
      : undefined
    const errors = [
      ...errorCases(rpc.errorSchema),
      ...(streamSchemas ? errorCases(streamSchemas.error) : []),
      ...[...rpc.middlewares].flatMap((m) => errorCases(m.error as Schema.Top))
    ]
    out.set(rpc._tag, {
      tag: rpc._tag,
      path: `/${serviceName}/${rpc._tag}`,
      stream: streamSchemas !== undefined,
      input: Layout.compileRoot(rpc.payloadSchema.ast),
      output: Layout.compileRoot((streamSchemas?.success ?? rpc.successSchema).ast),
      errors
    })
  }
  if (serviceNameOverride === undefined) methodsCache.set(group, out)
  return out
}

// -----------------------------------------------------------------------------
// exits
// -----------------------------------------------------------------------------

/**
 * The encoded failure of an rpc exit, either as a `Cause` or in the plain
 * encoded shape the server uses for defects it reports itself.
 *
 * @internal
 */
export type Failure =
  | { readonly _tag: "Fail"; readonly error: unknown }
  | { readonly _tag: "Die"; readonly defect: unknown }
  | { readonly _tag: "Interrupt" }

/** @internal */
export const exitFailure = (exit: unknown): Failure | undefined => {
  if (Exit.isExit(exit)) {
    if (Exit.isSuccess(exit)) return undefined
    const reasons = exit.cause.reasons
    const fail = reasons.find(Cause.isFailReason)
    if (fail) return { _tag: "Fail", error: fail.error }
    const die = reasons.find(Cause.isDieReason)
    if (die) return { _tag: "Die", defect: die.defect }
    return { _tag: "Interrupt" }
  }
  const plain = exit as {
    readonly _tag: string
    readonly cause?: ReadonlyArray<{ readonly _tag: string; readonly error?: unknown; readonly defect?: unknown }>
  }
  if (plain._tag === "Success") return undefined
  const cause = plain.cause ?? []
  const fail = cause.find((r) => r._tag === "Fail")
  if (fail) return { _tag: "Fail", error: fail.error }
  const die = cause.find((r) => r._tag === "Die")
  if (die) return { _tag: "Die", defect: die.defect }
  return { _tag: "Interrupt" }
}

/** @internal */
export const exitValue = (exit: unknown): unknown =>
  Exit.isExit(exit) ? (exit as Exit.Success<unknown>).value : (exit as { readonly value: unknown }).value

const defectMessage = (defect: unknown): string => {
  if (typeof defect === "object" && defect !== null && typeof (defect as any).message === "string") {
    return (defect as any).message
  }
  return typeof defect === "string" ? defect : "internal error"
}

/** @internal */
export const failureToWireError = (method: Method, failure: Failure): WireError => {
  switch (failure._tag) {
    case "Interrupt":
      return { code: "canceled", message: "request interrupted", details: [] }
    case "Die":
      return { code: "internal", message: defectMessage(failure.defect), details: [] }
    case "Fail": {
      const error = failure.error
      const found = method.errors.find((c) => c.guard(error))
      const message = typeof error === "object" && error !== null && typeof (error as any).message === "string"
        ? (error as any).message
        : typeof error === "object" && error !== null && typeof (error as any)._tag === "string"
        ? (error as any)._tag
        : String(error)
      if (found === undefined || found.root === undefined || found.typeName === undefined) {
        return { code: found?.code ?? "unknown", message, details: [] }
      }
      let debug: unknown
      try {
        debug = Json.encodeRootJson(found.root, error)
      } catch {
        debug = undefined
      }
      return {
        code: found.code,
        message,
        details: [{ type: found.typeName, value: Binary.encodeRoot(found.root, error), debug }]
      }
    }
  }
}

/**
 * Maps a wire error back to an encoded exit for the rpc client: a detail
 * matching one of the rpc's error schemas becomes a failure, anything else a
 * defect.
 *
 * @internal
 */
export const wireErrorToExit = (method: Method, error: WireError): Exit.Exit<never, unknown> => {
  for (const detail of error.details) {
    const found = method.errors.find((c) => c.typeName === detail.type && c.root !== undefined)
    if (found) {
      try {
        return Exit.fail(Binary.decodeRoot(found.root!, detail.value))
      } catch {
        break
      }
    }
  }
  return Exit.die(wireErrorToDefect(error))
}
