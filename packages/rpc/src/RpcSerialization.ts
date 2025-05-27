/**
 * @since 1.0.0
 */
import { Msgpackr } from "@effect/platform/MsgPack"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { hasProperty } from "effect/Predicate"
import type * as RpcMessage from "./RpcMessage.js"

/**
 * @since 1.0.0
 * @category serialization
 */
export class RpcSerialization extends Context.Tag("@effect/rpc/RpcSerialization")<RpcSerialization, {
  unsafeMake(): Parser
  readonly contentType: string
}>() {}

/**
 * @since 1.0.0
 * @category serialization
 */
export interface Parser {
  readonly decode: (data: Uint8Array | string) => ReadonlyArray<unknown>
  readonly encode: (response: unknown) => Uint8Array | string
}

/**
 * @since 1.0.0
 * @category serialization
 */
export const json: Effect.Effect<RpcSerialization["Type"]> = Effect.sync(() => {
  const decoder = new TextDecoder()
  return RpcSerialization.of({
    contentType: "application/json",
    unsafeMake: () => ({
      decode: (bytes) => [JSON.parse(typeof bytes === "string" ? bytes : decoder.decode(bytes))],
      encode: (response) => JSON.stringify(response)
    })
  })
})

/**
 * @since 1.0.0
 * @category serialization
 */
export const ndjson: Effect.Effect<RpcSerialization["Type"]> = Effect.sync(() => {
  const decoder = new TextDecoder()
  return RpcSerialization.of({
    contentType: "application/ndjson",
    unsafeMake: () => {
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
        encode: (response) => JSON.stringify(response) + "\n"
      })
    }
  })
})

/**
 * @since 1.0.0
 * @category serialization
 */
export const jsonrpc: Effect.Effect<RpcSerialization["Type"]> = Effect.sync(() => {
  const decoder = new TextDecoder()
  return RpcSerialization.of({
    contentType: "application/json-rpc",
    supportsBigInt: false,
    unsafeMake: () => ({
      decode: (bytes) => {
        const decoded: JsonRpcMessage = JSON.parse(typeof bytes === "string" ? bytes : decoder.decode(bytes))
        let rpcMessage: RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded

        if ("method" in decoded) {
          rpcMessage = {
            _tag: "Request",
            id: String(decoded.id),
            tag: decoded.method,
            payload: decoded.params,
            headers: decoded.headers ?? [],
            traceId: decoded.traceId ?? "noop",
            spanId: decoded.spanId ?? "noop",
            sampled: decoded.sampled ?? false
          }
        } else if (decoded.error && decoded.error._tag === "Defect") {
          rpcMessage = {
            _tag: "Defect",
            defect: decoded.error.data
          }
        } else {
          rpcMessage = decoded.chunk === true ?
            {
              _tag: "Chunk",
              requestId: String(decoded.id),
              values: decoded.result as any
            } :
            {
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

        return [rpcMessage]
      },
      encode: (response_) => {
        const response = response_ as RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded

        let jsonRpcMessage: JsonRpcMessage
        if (response._tag === "Request") {
          jsonRpcMessage = {
            jsonrpc: "2.0",
            method: response.tag,
            params: response.payload,
            id: Number(response.id),
            headers: response.headers,
            traceId: response.traceId,
            spanId: response.spanId,
            sampled: response.sampled
          }
        } else if (response._tag === "Chunk") {
          jsonRpcMessage = {
            jsonrpc: "2.0",
            chunk: true,
            id: Number(response.requestId),
            result: response.values
          }
        } else if (response._tag === "Exit") {
          jsonRpcMessage = {
            jsonrpc: "2.0",
            id: Number(response.requestId),
            result: response.exit._tag === "Success" ? response.exit.value : undefined,
            error: response.exit._tag === "Failure" ?
              {
                _tag: "Cause",
                code: response.exit.cause._tag === "Fail" && hasProperty(response.exit.cause.error, "code")
                  ? Number(response.exit.cause.error.code)
                  : 0,
                message: "An error occurred",
                data: response.exit.cause
              } :
              undefined
          } as any
        } else if (response._tag === "Defect") {
          jsonRpcMessage = {
            jsonrpc: "2.0",
            id: jsonRpcInternalError,
            error: {
              _tag: "Defect",
              code: 1,
              message: "A defect occurred",
              data: response.defect
            }
          }
        } else {
          throw new Error("Unknown message type")
        }

        return JSON.stringify(jsonRpcMessage!) + "\n"
      }
    })
  })
})

const jsonRpcInternalError = -32603

interface JsonRpcRequest {
  readonly jsonrpc: "2.0"
  readonly id: number
  readonly method: string
  readonly params?: unknown
  readonly headers?: ReadonlyArray<[string, string]>
  readonly traceId?: string
  readonly spanId?: string
  readonly sampled?: boolean
}

interface JsonRpcResponse {
  readonly jsonrpc: "2.0"
  readonly id: number
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
  unsafeMake: () => {
    const unpackr = new Msgpackr.Unpackr()
    const packr = new Msgpackr.Packr()
    const encoder = new TextEncoder()
    return ({
      decode: (bytes) => unpackr.unpackMultiple(typeof bytes === "string" ? encoder.encode(bytes) : bytes),
      encode: (response) => packr.pack(response)
    })
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
export const layerJson: Layer.Layer<RpcSerialization> = Layer.effect(RpcSerialization, json)

/**
 * A rpc serialization layer that uses NDJSON for serialization.
 *
 * Use this if your protocol does not support framing for messages, otherwise
 * use {@link layerJson}.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerNdjson: Layer.Layer<RpcSerialization> = Layer.effect(RpcSerialization, ndjson)

/**
 * A rpc serialization layer that uses JSON-RPC for serialization.
 *
 * Use this if your protocol does not support framing for messages, otherwise
 * use `layerSerializationJson`.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerJsonRpc: Layer.Layer<RpcSerialization> = Layer.effect(RpcSerialization, jsonrpc)

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
