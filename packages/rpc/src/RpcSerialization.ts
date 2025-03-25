/**
 * @since 1.0.0
 */
import { Msgpackr } from "@effect/platform/MsgPack"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category serialization
 */
export class RpcSerialization extends Context.Tag("@effect/rpc/RpcSerialization")<RpcSerialization, {
  unsafeMake(): Parser
  readonly contentType: string
  readonly supportsBigInt: boolean
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
    supportsBigInt: false,
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
    supportsBigInt: false,
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
export const msgPack: RpcSerialization["Type"] = RpcSerialization.of({
  contentType: "application/msgpack",
  supportsBigInt: true,
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
 * A rpc serialization layer that uses MessagePack for serialization.
 *
 * MessagePack has a more compact binary format compared to JSON and NDJSON. It
 * also has better support for binary data.
 *
 * @since 1.0.0
 * @category serialization
 */
export const layerMsgPack: Layer.Layer<RpcSerialization> = Layer.succeed(RpcSerialization, msgPack)
