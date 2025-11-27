/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import { hasProperty } from "effect/Predicate"
import * as Msgpackr from "msgpackr"
import type * as RpcMessage from "./RpcMessage.js"

/**
 * @since 1.0.0
 * @category serialization
 */
export class RpcSerialization extends Context.Tag("@effect/rpc/RpcSerialization")<RpcSerialization, {
  unsafeMake(): Parser
  readonly contentType: string
  readonly includesFraming: boolean
}>() {}

/**
 * @since 1.0.0
 * @category serialization
 */
export interface Parser {
  readonly decode: (data: Uint8Array | string) => ReadonlyArray<unknown>
  readonly encode: (response: unknown) => Uint8Array | string | undefined
}

/**
 * @since 1.0.0
 * @category serialization
 */
export const json: RpcSerialization["Type"] = RpcSerialization.of({
  contentType: "application/json",
  includesFraming: false,
  unsafeMake: () => {
    const decoder = new TextDecoder()
    return {
      decode: (bytes) => [JSON.parse(typeof bytes === "string" ? bytes : decoder.decode(bytes))],
      encode: (response) => JSON.stringify(response)
    }
  }
})

/**
 * @since 1.0.0
 * @category serialization
 */
export const ndjson: RpcSerialization["Type"] = RpcSerialization.of({
  contentType: "application/ndjson",
  includesFraming: true,
  unsafeMake: () => {
    const decoder = new TextDecoder()
    let buffer = ""
    return ({
      decode: (bytes) => {
        buffer += typeof bytes === "string" ? bytes : decoder.decode(bytes)
        let position = 0
        let nlIndex = buffer.indexOf("\n", position)
        const items: Array<unknown> = []
        while (nlIndex !== -1) {
          const item = JSON.parse(buffer.slice(position, nlIndex))
          items.push(item)
          position = nlIndex + 1
          nlIndex = buffer.indexOf("\n", position)
        }
        buffer = buffer.slice(position)
        return items
      },
      encode: (response) => {
        if (Array.isArray(response)) {
          if (response.length === 0) return undefined
          let data = ""
          for (let i = 0; i < response.length; i++) {
            data += JSON.stringify(response[i]) + "\n"
          }
          return data
        }
        return JSON.stringify(response) + "\n"
      }
    })
  }
})

/**
 * @since 1.0.0
 * @category serialization
 */
export const jsonRpc = (options?: {
  readonly contentType?: string | undefined
}): RpcSerialization["Type"] =>
  RpcSerialization.of({
    contentType: options?.contentType ?? "application/json",
    includesFraming: false,
    unsafeMake: () => {
      const decoder = new TextDecoder()
      const batches = new Map<string, {
        readonly size: number
        readonly responses: Map<string, RpcMessage.FromServerEncoded>
      }>()
      return {
        decode: (bytes) => {
          const decoded: JsonRpcMessage | Array<JsonRpcMessage> = JSON.parse(
            typeof bytes === "string" ? bytes : decoder.decode(bytes)
          )
          return decodeJsonRpcRaw(decoded, batches)
        },
        encode: (response) => {
          if (Array.isArray(response)) {
            if (response.length === 0) return undefined
            return JSON.stringify(response.map(encodeJsonRpcMessage))
          }
          const encoded = encodeJsonRpcRaw(response as any, batches)
          return encoded && JSON.stringify(encoded)
        }
      }
    }
  })

/**
 * @since 1.0.0
 * @category serialization
 */
export const ndJsonRpc = (options?: {
  readonly contentType?: string | undefined
}): RpcSerialization["Type"] =>
  RpcSerialization.of({
    contentType: options?.contentType ?? "application/json-rpc",
    includesFraming: true,
    unsafeMake: () => {
      const parser = ndjson.unsafeMake()
      const batches = new Map<string, {
        readonly size: number
        readonly responses: Map<string, RpcMessage.FromServerEncoded>
      }>()
      return ({
        decode: (bytes) => {
          const frames = parser.decode(bytes)
          if (frames.length === 0) return []
          const messages: Array<RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded> = []
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i]
            // eslint-disable-next-line no-restricted-syntax
            messages.push(...decodeJsonRpcRaw(frame as any, batches) as any)
          }
          return messages
        },
        encode: (response) => {
          if (Array.isArray(response)) {
            return parser.encode(response.map(encodeJsonRpcMessage))
          }
          const encoded = encodeJsonRpcRaw(response as any, batches)
          return encoded && parser.encode(encoded)
        }
      })
    }
  })

function decodeJsonRpcRaw(
  decoded: JsonRpcMessage | Array<JsonRpcMessage>,
  batches: Map<string, {
    readonly size: number
    readonly responses: Map<string, RpcMessage.FromServerEncoded>
  }>
) {
  if (Array.isArray(decoded)) {
    const batch = {
      size: 0,
      responses: new Map<string, RpcMessage.FromServerEncoded>()
    }
    const messages: Array<RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded> = []
    for (let i = 0; i < decoded.length; i++) {
      const message = decodeJsonRpcMessage(decoded[i])
      if (message._tag === "Request") {
        batch.size++
        batches.set(message.id, batch)
      }
    }
    return messages
  }
  return Array.isArray(decoded) ? decoded.map(decodeJsonRpcMessage) : [decodeJsonRpcMessage(decoded)]
}

function decodeJsonRpcMessage(decoded: JsonRpcMessage): RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded {
  if ("method" in decoded) {
    if (!decoded.id && decoded.method.startsWith("@effect/rpc/")) {
      const tag = decoded.method.slice("@effect/rpc/".length) as
        | RpcMessage.FromServerEncoded["_tag"]
        | Exclude<RpcMessage.FromClientEncoded["_tag"], "Request">
      const requestId = (decoded as any).params?.requestId
      return requestId ?
        {
          _tag: tag,
          requestId: String(requestId)
        } as any :
        { _tag: tag } as any
    }
    return {
      _tag: "Request",
      id: decoded.id ? String(decoded.id) : "",
      tag: decoded.method,
      payload: decoded.params,
      headers: decoded.headers ?? [],
      traceId: decoded.traceId,
      spanId: decoded.spanId,
      sampled: decoded.sampled
    }
  } else if (decoded.error && decoded.error._tag === "Defect") {
    return {
      _tag: "Defect",
      defect: decoded.error.data
    }
  } else if (decoded.chunk === true) {
    return {
      _tag: "Chunk",
      requestId: String(decoded.id),
      values: decoded.result as any
    }
  }
  return {
    _tag: "Exit",
    requestId: String(decoded.id),
    exit: decoded.error != null ?
      {
        _tag: "Failure",
        cause: decoded.error._tag === "Cause" ?
          decoded.error.data as any :
          {
            _tag: "Die",
            defect: decoded.error
          }
      } :
      {
        _tag: "Success",
        value: decoded.result
      }
  }
}

function encodeJsonRpcRaw(
  response: RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded,
  batches: Map<string, {
    readonly size: number
    readonly responses: Map<string, RpcMessage.FromServerEncoded>
  }>
) {
  if (!("requestId" in response)) {
    return encodeJsonRpcMessage(response)
  }
  const batch = batches.get(response.requestId)
  if (batch) {
    batches.delete(response.requestId)
    batch.responses.set(response.requestId, response as any)
    if (batch.size === batch.responses.size) {
      return Array.from(batch.responses.values(), encodeJsonRpcMessage)
    }
    return undefined
  }
  return encodeJsonRpcMessage(response)
}

function encodeJsonRpcMessage(response: RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded): JsonRpcMessage {
  switch (response._tag) {
    case "Request":
      return {
        jsonrpc: "2.0",
        method: response.tag,
        params: response.payload,
        id: response.id && Number(response.id),
        headers: response.headers,
        traceId: response.traceId,
        spanId: response.spanId,
        sampled: response.sampled
      }
    case "Ping":
    case "Pong":
    case "Interrupt":
    case "Ack":
    case "Eof":
      return {
        jsonrpc: "2.0",
        method: `@effect/rpc/${response._tag}`,
        params: "requestId" in response ? { requestId: response.requestId } : undefined
      }
    case "Chunk":
      return {
        jsonrpc: "2.0",
        chunk: true,
        id: Number(response.requestId),
        result: response.values
      }
    case "Exit":
      return {
        jsonrpc: "2.0",
        id: response.requestId ? Number(response.requestId) : undefined,
        result: response.exit._tag === "Success" ? response.exit.value : undefined,
        error: response.exit._tag === "Failure" ?
          {
            _tag: "Cause",
            code: response.exit.cause._tag === "Fail" && hasProperty(response.exit.cause.error, "code")
              ? Number(response.exit.cause.error.code)
              : 0,
            message: response.exit.cause._tag === "Fail" && hasProperty(response.exit.cause.error, "message")
              ? response.exit.cause.error.message
              : JSON.stringify(response.exit.cause),
            data: response.exit.cause
          } :
          undefined
      } as any
    case "Defect":
      return {
        jsonrpc: "2.0",
        id: jsonRpcInternalError,
        error: {
          _tag: "Defect",
          code: 1,
          message: "A defect occurred",
          data: response.defect
        }
      }
    case "ClientProtocolError":
      return {} as never
  }
}

const jsonRpcInternalError = -32603

interface JsonRpcRequest {
  readonly jsonrpc: "2.0"
  readonly id?: number | string | null
  readonly method: string
  readonly params?: unknown
  readonly headers?: ReadonlyArray<[string, string]>
  readonly traceId?: string
  readonly spanId?: string
  readonly sampled?: boolean
}

interface JsonRpcResponse {
  readonly jsonrpc: "2.0"
  readonly id?: number | string | null
  readonly result?: unknown
  readonly chunk?: boolean
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: unknown
    readonly _tag?: "Cause" | "Defect"
  }
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse

/**
 * @since 1.0.0
 * @category serialization
 */
export const msgPack: RpcSerialization["Type"] = RpcSerialization.of({
  contentType: "application/msgpack",
  includesFraming: true,
  unsafeMake: () => {
    const unpackr = new Msgpackr.Unpackr()
    const packr = new Msgpackr.Packr()
    const encoder = new TextEncoder()
    let incomplete: Uint8Array | undefined = undefined
    return {
      decode: (bytes) => {
        let buf = typeof bytes === "string" ? encoder.encode(bytes) : bytes
        if (incomplete !== undefined) {
          const prev = buf
          bytes = new Uint8Array(incomplete.length + buf.length)
          bytes.set(incomplete)
          bytes.set(prev, incomplete.length)
          buf = bytes
          incomplete = undefined
        }
        try {
          return unpackr.unpackMultiple(buf)
        } catch (error_) {
          const error = error_ as any
          if (error.incomplete) {
            incomplete = buf.subarray(error.lastPosition)
            return error.values ?? []
          }
          return []
        }
      },
      encode: (response) => packr.pack(response)
    }
  }
})

/**
 * A rpc serialization layer that uses JSON for serialization.
 *
 * Use this if your protocol supports framing for messages, otherwise use
 * {@link layerNdjson}.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerJson: Layer.Layer<RpcSerialization> = Layer.succeed(RpcSerialization, json)

/**
 * A rpc serialization layer that uses NDJSON for serialization.
 *
 * Use this if your protocol does not support framing for messages, otherwise
 * use {@link layerJson}.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerNdjson: Layer.Layer<RpcSerialization> = Layer.succeed(RpcSerialization, ndjson)

/**
 * A rpc serialization layer that uses JSON-RPC for serialization.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerJsonRpc = (options?: {
  readonly contentType?: string | undefined
}): Layer.Layer<RpcSerialization> => Layer.succeed(RpcSerialization, jsonRpc(options))

/**
 * A rpc serialization layer that uses JSON-RPC for serialization seperated by
 * new lines.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerNdJsonRpc = (options?: {
  readonly contentType?: string | undefined
}): Layer.Layer<RpcSerialization> => Layer.succeed(RpcSerialization, ndJsonRpc(options))

/**
 * A rpc serialization layer that uses MessagePack for serialization.
 *
 * MessagePack has a more compact binary format compared to JSON and NDJSON. It
 * also has better support for binary data.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerMsgPack: Layer.Layer<RpcSerialization> = Layer.succeed(RpcSerialization, msgPack)
