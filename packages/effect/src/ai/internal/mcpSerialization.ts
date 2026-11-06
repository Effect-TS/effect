/**
 * @internal
 */
import type * as Arr from "../../Array.ts"
import * as Predicate from "../../Predicate.ts"
import * as RpcSerialization from "../../rpc/RpcSerialization.ts"
import type * as McpProtocol from "../McpProtocol.ts"
import * as McpSchema from "../McpSchema.ts"
import * as McpRuntime from "./mcpRuntime.ts"

const errors = new WeakMap<object, { readonly code: number; readonly message: string }>()
const mcpCodecs = new WeakSet<RpcSerialization.CodecFor>()

/**
 * @internal
 */
export const isMcpCodec = (codec: RpcSerialization.CodecFor): boolean => mcpCodecs.has(codec)

/**
 * @internal
 */
export const getError = (message: object) => errors.get(message)

const invalidFrame = (code: number, message: string, id: symbol | null = null) => {
  // Identity, rather than a reserved method name, distinguishes decoder errors
  // from peer-supplied requests. No protocol/session metadata is needed to reply.
  const request = { _tag: "Request", id, tag: "", payload: null, headers: [] }
  errors.set(request, { code, message })
  return request
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Predicate.isReadonlyObject(value) && !Array.isArray(value)

const isId = (value: unknown): value is string | number =>
  typeof value === "string" || (typeof value === "number" && Number.isFinite(value))

// Do not forward Effect RPC's wire extensions, such as discard, headers, chunk,
// or error._tag. They must not change the meaning of an MCP message.
const messageEnvelope = (message: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(message) || message.jsonrpc !== "2.0") return undefined
  const hasId = Object.hasOwn(message, "id")
  const hasResult = Object.hasOwn(message, "result")
  const hasError = Object.hasOwn(message, "error")
  if (Object.hasOwn(message, "method")) {
    // Legacy revisions allow finite numeric IDs; the modern request schema
    // narrows them to integers. Do not apply the modern restriction to sessions.
    const modern = isRecord(message.params) && isRecord(message.params._meta) &&
      message.params._meta["io.modelcontextprotocol/protocolVersion"] === "2026-07-28"
    if (
      typeof message.method !== "string" || hasResult || hasError || (hasId && !isId(message.id)) ||
      (modern && typeof message.id === "number" && !Number.isInteger(message.id))
    ) return undefined
    return {
      jsonrpc: "2.0",
      method: message.method,
      ...(hasId ? { id: message.id } : {}),
      ...(Object.hasOwn(message, "params") ? { params: message.params } : {})
    }
  }
  if (!hasId || hasResult === hasError) return undefined
  if (hasError) {
    const error = message.error
    if (
      (!isId(message.id) && message.id !== null) || !isRecord(error) ||
      !Number.isInteger(error.code) || typeof error.message !== "string"
    ) return undefined
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: error.code,
        message: error.message,
        ...(Object.hasOwn(error, "data") ? { data: error.data } : {})
      }
    }
  }
  return isId(message.id) ? { jsonrpc: "2.0", id: message.id, result: message.result } : undefined
}

/**
 * @internal
 */
export const makeParser = (parser: RpcSerialization.Parser): RpcSerialization.Parser => {
  const batches = new Map<unknown, { remaining: number; readonly responses: Array<unknown> }>()
  const decodeMessage = (message: unknown, batch = false) => {
    const envelope = messageEnvelope(message)
    return envelope === undefined
      ? [invalidFrame(McpSchema.INVALID_REQUEST_ERROR_CODE, "Invalid Request", batch ? Symbol() : null)]
      : parser.decode(JSON.stringify(envelope))
  }
  return {
    decode: (data) => {
      let frame: unknown
      try {
        frame = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data))
      } catch {
        return [invalidFrame(McpSchema.PARSE_ERROR_CODE, "Parse error")]
      }
      if (!Array.isArray(frame)) return decodeMessage(frame)
      if (frame.length === 0) return [invalidFrame(McpSchema.INVALID_REQUEST_ERROR_CODE, "Invalid Request")]
      const batch = { remaining: 0, responses: [] as Array<unknown> }
      const messages = frame.flatMap((message) => decodeMessage(message, true))
      for (const message of messages) {
        if (isRecord(message) && message._tag === "Request" && message.isNotification !== true) {
          batch.remaining++
          batches.set(message.id, batch)
        }
      }
      return messages
    },
    encode: (response) => {
      // These are internal RPC controls, not MCP wire messages.
      if (
        isRecord(response) && response._tag !== "Request" && response._tag !== "Exit" && response._tag !== "Defect"
      ) return undefined
      const encoded = parser.encode(
        isRecord(response) && response._tag === "Request"
          ? {
            _tag: "Request",
            id: response.id,
            tag: response.tag,
            payload: response.payload,
            headers: [],
            ...(response.isNotification === true ? { isNotification: true } : {})
          }
          : response
      )
      const batch = isRecord(response) && response._tag === "Exit" ? batches.get(response.requestId) : undefined
      if (batch === undefined) return encoded
      batches.delete((response as Record<string, unknown>).requestId)
      if (typeof encoded === "string") batch.responses.push(JSON.parse(encoded))
      batch.remaining--
      return batch.remaining === 0 && batch.responses.length > 0 ? JSON.stringify(batch.responses) : undefined
    }
  }
}

/**
 * @internal
 */
export const makeSerialization = (options: {
  readonly serialization: RpcSerialization.RpcSerialization["Service"]
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly framing: "ndjson" | "json"
  readonly maxBufferSize?: number | "unbounded" | undefined
}): RpcSerialization.RpcSerialization["Service"] => {
  const maxBufferSize = options.maxBufferSize ?? 16 * 1024 * 1024
  const codecFor: RpcSerialization.CodecFor = (schema) => options.serialization.codecFor(schema)
  mcpCodecs.add(codecFor)
  return RpcSerialization.RpcSerialization.of({
    ...options.serialization,
    codecFor,
    includesFraming: options.framing === "ndjson",
    makeUnsafe: () => {
      const parser = options.serialization.makeUnsafe()
      let selectedProtocol: McpProtocol.ProtocolAdapter | undefined
      let decoder: TextDecoder | undefined
      let buffer = ""
      let frameSize = 0
      let invalidEncoding = false
      const checkSize = (size: number) => {
        if (maxBufferSize !== "unbounded" && size > maxBufferSize) {
          buffer = ""
          decoder = undefined
          frameSize = 0
          invalidEncoding = false
          throw new RpcSerialization.MaxBufferSizeExceeded({ maxBufferSize })
        }
      }
      const decodeFrame = (text: string): ReadonlyArray<unknown> => {
        let frame: unknown
        try {
          frame = JSON.parse(text)
        } catch {
          // https://www.jsonrpc.org/specification#response_object
          return [invalidFrame(McpSchema.PARSE_ERROR_CODE, "Parse error")]
        }
        if (Array.isArray(frame)) {
          // Both 2025-11-25 and 2026-07-28 disallow batches. Older configured
          // adapters, such as 2025-03-26, retain their negotiated batch policy.
          if (
            selectedProtocol?.runtime.transport.jsonRpc.acceptsBatches !== true || frame.length === 0 ||
            frame.some(McpRuntime.hasRequestProtocolVersion) ||
            frame.some((item) => isRecord(item) && item.method === "initialize")
          ) {
            return [invalidFrame(McpSchema.INVALID_REQUEST_ERROR_CODE, "JSON-RPC batches are not supported")]
          }
          return parser.decode(JSON.stringify(frame))
        }
        const envelope = messageEnvelope(frame)
        if (envelope === undefined) {
          return [invalidFrame(McpSchema.INVALID_REQUEST_ERROR_CODE, "Invalid Request")]
        }
        if (envelope.method === "initialize" && Object.hasOwn(envelope, "id")) {
          const version = isRecord(envelope.params) && typeof envelope.params.protocolVersion === "string"
            ? envelope.params.protocolVersion
            : undefined
          selectedProtocol = McpRuntime.selectStatefulProtocol(options.protocols, version)
        }
        return parser.decode(JSON.stringify(envelope))
      }
      return {
        decode: (data) => {
          if (options.framing === "json") {
            checkSize(data.length)
            let text: string
            try {
              text = typeof data === "string" ? data : new TextDecoder("utf-8", { fatal: true }).decode(data)
            } catch {
              return [invalidFrame(McpSchema.PARSE_ERROR_CODE, "Parse error")]
            }
            return decodeFrame(text)
          }
          const messages: Array<unknown> = []
          const append = (part: string | Uint8Array, complete: boolean) => {
            frameSize += part.length
            checkSize(frameSize)
            if (!invalidEncoding) {
              try {
                if (typeof part === "string") {
                  if (decoder !== undefined) buffer += decoder.decode()
                  decoder = undefined
                  buffer += part
                } else {
                  buffer += (decoder ??= new TextDecoder("utf-8", { fatal: true })).decode(part, { stream: !complete })
                  if (complete) decoder = undefined
                }
              } catch {
                buffer = ""
                decoder = undefined
                invalidEncoding = true
              }
            }
            if (!complete) return
            if (invalidEncoding) {
              messages.push(invalidFrame(McpSchema.PARSE_ERROR_CODE, "Parse error"))
            } else {
              const line = buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer
              if (line.length > 0) messages.push(...decodeFrame(line))
            }
            buffer = ""
            frameSize = 0
            invalidEncoding = false
          }
          let position = 0
          const findNewline = () => typeof data === "string" ? data.indexOf("\n", position) : data.indexOf(10, position)
          let newline = findNewline()
          while (newline !== -1) {
            append(data.slice(position, newline), true)
            position = newline + 1
            newline = findNewline()
          }
          if (position < data.length) append(data.slice(position), false)
          return messages
        },
        encode: (response) => {
          const encoded = parser.encode(response)
          return encoded === undefined || options.framing === "json" ? encoded : `${encoded}\n`
        }
      }
    }
  })
}
