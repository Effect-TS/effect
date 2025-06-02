/**
 * @since 1.0.0
 */
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import type { Readable, Writable } from "node:stream"
import type {
  ClientNotificationEncoded,
  ClientRequestEncoded,
  FromClientEncoded,
  FromServerEncoded,
  JsonRpcNotification,
  JsonRpcRequest
} from "./McpSchema.js"

/**
 * Represents a transport which can send and receive messages.
 *
 * @since 1.0.0
 * @category Transport
 */
export class McpTransport extends Context.Tag("@effect/ai/McpTransport")<McpTransport, {
  readonly run: (
    handleMessage: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>
  ) => Effect.Effect<never>
  readonly send: (
    clientId: number,
    message: FromServerEncoded | ReadonlyArray<FromServerEncoded>
  ) => Effect.Effect<void>
  readonly end: (clientId: number) => Effect.Effect<void>
}>() {}

const JSON_RPC_VERSION = "2.0" as const

/**
 * @since 1.0.0
 * @category Transport
 */
export const makeTransportStdio = Effect.fnUntraced(function*(options?: {
  readonly stdin?: LazyArg<Readable>
  readonly stdout?: LazyArg<Writable>
}) {
  const stdin = options?.stdin?.() ?? process.stdin
  const stdout = options?.stdout?.() ?? process.stdout
  const serialization = yield* RpcSerialization.ndjson
  const parser = serialization.unsafeMake()
  const mailbox = yield* Mailbox.make<FromClientEncoded>()

  function onData(data: any) {
    const results = parser.decode(data) as ReadonlyArray<
      JsonRpcRequest | JsonRpcNotification
    >
    if (results.length > 0) {
      mailbox.unsafeOfferAll(results.map((message) => {
        const base = { method: message.method, payload: message.params ?? {} }
        return "id" in message
          ? { ...base, _tag: "Request", id: message.id } as ClientRequestEncoded
          : { ...base, _tag: "Notification" } as ClientNotificationEncoded
      }))
    }
  }

  function onError(error: unknown) {
    mailbox.unsafeDone(Exit.die(error))
  }

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      // Remove our event listeners first
      stdin.off("data", onData)
      stdin.off("error", onError)

      // Check if we were the only data listener
      const listeners = stdin.listenerCount("data")
      if (listeners === 0) {
        // Only pause stdin if we were the only listener - this prevents
        // interfering with other parts of the application that might be using
        // stdin
        stdin.pause()
      }
    })
  )

  // Setup the listeners
  stdin.on("data", onData)
  stdin.on("error", onError)

  const sendMessage = Effect.fnUntraced(
    function*(_clientId: number, message: FromServerEncoded) {
      let encoded: Uint8Array | string
      switch (message._tag) {
        case "Success": {
          encoded = parser.encode({
            jsonrpc: JSON_RPC_VERSION,
            id: message.id,
            result: message.result
          })
          break
        }
        case "Failure": {
          encoded = parser.encode({
            jsonrpc: JSON_RPC_VERSION,
            id: message.id,
            error: message.error
          })
          break
        }
        case "Notification": {
          encoded = parser.encode({
            jsonrpc: JSON_RPC_VERSION,
            method: message.method,
            params: message.payload
          })
          break
        }
      }
      if (!stdout.write(encoded)) {
        yield* Effect.async<void>((resume) => {
          stdout.once("drain", () => resume(Effect.void))
        })
      }
    }
  )

  return McpTransport.of({
    run: Effect.fnUntraced(function*(handleMessage) {
      while (true) {
        const [requests] = yield* mailbox.takeAll
        for (const request of requests) {
          yield* handleMessage(0, request)
        }
      }
    }),
    send: (clientId, messages) => {
      if (Array.isArray(messages)) {
        return Effect.forEach(
          messages as ReadonlyArray<FromServerEncoded>,
          (message) => sendMessage(clientId, message),
          { discard: true }
        )
      }
      return sendMessage(clientId, messages as FromServerEncoded)
    },
    end(_sessionId) {
      return Effect.void
    }
  })
})

/**
 * @since 1.0.0
 * @category Transport
 */
export const layerTransportStdio = (options?: {
  readonly stdin?: LazyArg<Readable>
  readonly stdout?: LazyArg<Writable>
}): Layer.Layer<McpTransport> =>
  Layer.scoped(McpTransport, makeTransportStdio(options)).pipe(
    Layer.provide(RpcSerialization.layerNdjson)
  )
