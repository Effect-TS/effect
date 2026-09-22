import { Socket, SocketServer } from "@effect/platform"
import { RpcSerialization, RpcServer } from "@effect/rpc"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Layer } from "effect"

const prototypeDescriptors = new Map<PropertyKey, PropertyDescriptor | undefined>()

const polluteObjectPrototype = (property: PropertyKey, value: unknown) => {
  prototypeDescriptors.set(property, Object.getOwnPropertyDescriptor(Object.prototype, property))
  Object.defineProperty(Object.prototype, property, { configurable: true, value })
}

afterEach(() => {
  for (const [property, descriptor] of prototypeDescriptors) {
    if (descriptor) {
      Object.defineProperty(Object.prototype, property, descriptor)
    } else {
      Reflect.deleteProperty(Object.prototype, property)
    }
  }
  prototypeDescriptors.clear()
})

const responseExitSuccess = (requestId: string, value: unknown) => ({
  _tag: "Exit",
  requestId,
  exit: {
    _tag: "Success",
    value
  }
})

const parseResponses = (encoded: string) => {
  const responses = encoded.trim().split("\n").map((response) => JSON.parse(response))
  return responses.length === 1 && Array.isArray(responses[0]) ? responses[0] : responses
}

const assertBatchRoundTrip = (parser: RpcSerialization.Parser, frame: string) => {
  const decoded = parser.decode(frame)
  assert.deepStrictEqual(decoded.map((message: any) => message.id), ["1", "2"])

  const encoded = parser.encode([
    responseExitSuccess("1", "one"),
    responseExitSuccess("2", "two")
  ])
  assert(encoded !== undefined)
  assert.deepStrictEqual(parseResponses(encoded as string), [
    { jsonrpc: "2.0", id: 1, result: "one" },
    { jsonrpc: "2.0", id: 2, result: "two" }
  ])

  const afterBatch = parser.encode(responseExitSuccess("1", "after batch"))
  assert(afterBatch !== undefined)
  assert.deepStrictEqual(parseResponses(afterBatch as string), [{
    jsonrpc: "2.0",
    id: 1,
    result: "after batch"
  }])
}

const captureSerializationError = (decode: () => unknown) => {
  try {
    decode()
  } catch (error) {
    assert(error instanceof RpcSerialization.RpcSerializationError)
    return error
  }
  return assert.fail("Expected an RpcSerializationError")
}

describe("RpcSerialization", () => {
  describe("ndjson", () => {
    it("limits the buffered frame size", () => {
      const parser = RpcSerialization.makeNdjson({ maxBufferSize: 4 }).unsafeMake()
      assert.deepStrictEqual(parser.decode("1234"), [])
      const error = captureSerializationError(() => parser.decode("5"))
      assert.strictEqual(error.reason, "BufferSizeExceeded")
      assert.strictEqual(error.bufferSize, 5)
    })

    it("allows the buffer limit to be disabled", () => {
      const parser = RpcSerialization.makeNdjson({ maxBufferSize: "unbounded" }).unsafeMake()
      assert.deepStrictEqual(parser.decode("123456789"), [])
    })
  })

  describe("ndJsonRpc", () => {
    it("passes the buffer limit to ndjson", () => {
      const parser = RpcSerialization.ndJsonRpc({ maxBufferSize: 4 }).unsafeMake()
      captureSerializationError(() => parser.decode("12345"))
    })
  })

  describe("jsonRpc", () => {
    it("dispatches batched requests and clears completed batch state", () => {
      assertBatchRoundTrip(
        RpcSerialization.jsonRpc().unsafeMake(),
        "[{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"one\"},{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"two\"}]"
      )
    })
  })

  describe("ndJsonRpc", () => {
    it("dispatches batched requests and clears completed batch state", () => {
      assertBatchRoundTrip(
        RpcSerialization.ndJsonRpc().unsafeMake(),
        "[{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"one\"},{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"two\"}]\n"
      )
    })
  })

  describe("msgPack", () => {
    it("encode and decode correctly", () => {
      const parser = RpcSerialization.msgPack.unsafeMake()
      const payload = { _tag: "Request", id: 1, method: "echo" }
      const encoded = parser.encode(payload)
      const decoded = parser.decode(encoded as Uint8Array)
      assert.strictEqual(decoded.length, 1)
      assert.deepStrictEqual(decoded[0], payload)
    })

    it("handles incomplete frames gracefully", () => {
      const parser = RpcSerialization.msgPack.unsafeMake()
      const helper = RpcSerialization.msgPack.unsafeMake()

      const msg1 = helper.encode({ a: 1 }) as Uint8Array
      const msg2 = helper.encode({ b: 2 }) as Uint8Array
      const combined = new Uint8Array(msg1.length + msg2.length)
      combined.set(msg1)
      combined.set(msg2, msg1.length)

      const truncated = combined.subarray(0, msg1.length + 2)
      const decoded = parser.decode(truncated)

      assert.strictEqual(decoded.length, 1)
      assert.deepStrictEqual(decoded[0], { a: 1 })
    })
  })

  describe("makeMsgPack", () => {
    it("limits incomplete frame buffering", () => {
      const parser = RpcSerialization.makeMsgPack({ maxBufferSize: 6 }).unsafeMake()
      assert.deepStrictEqual(parser.decode(Uint8Array.of(0xdb, 0, 0, 0, 10)), [])
      assert.deepStrictEqual(parser.decode(Uint8Array.of(1)), [])
      const error = captureSerializationError(() => parser.decode(Uint8Array.of(2)))
      assert.strictEqual(error.reason, "BufferSizeExceeded")
      assert.strictEqual(error.bufferSize, 7)
    })

    it("useRecords false encode and decode correctly", () => {
      const parser = RpcSerialization.makeMsgPack({ useRecords: false }).unsafeMake()
      const payload = { _tag: "Request", id: 1, method: "echo" }
      const encoded = parser.encode(payload)
      const decoded = parser.decode(encoded as Uint8Array)
      assert.strictEqual(decoded.length, 1)
      assert.deepStrictEqual(decoded[0], payload)
    })

    it("useRecords false handles nested objects with repeated structures", () => {
      const parser = RpcSerialization.makeMsgPack({ useRecords: false }).unsafeMake()
      const payload = {
        _tag: "Chunk",
        requestId: "1",
        values: [
          { _tag: "Exit", requestId: "1", exit: { _tag: "Success", value: { _tag: "Ok", data: "a" } } },
          { _tag: "Exit", requestId: "2", exit: { _tag: "Success", value: { _tag: "Ok", data: "b" } } },
          { _tag: "Exit", requestId: "3", exit: { _tag: "Success", value: { _tag: "Ok", data: "c" } } },
          { _tag: "Exit", requestId: "4", exit: { _tag: "Success", value: { _tag: "Ok", data: "d" } } }
        ]
      }
      const encoded = parser.encode(payload)
      const decoded = parser.decode(encoded as Uint8Array)
      assert.strictEqual(decoded.length, 1)
      assert.deepStrictEqual(decoded[0], payload)
    })
  })

  it.effect("closes a socket when the buffer limit is exceeded", () =>
    Effect.scoped(Effect.gen(function*() {
      const closed = yield* Deferred.make<Socket.CloseEvent>()
      const socket = Socket.Socket.of({
        [Socket.TypeId]: Socket.TypeId,
        run: () => Effect.void,
        runRaw: (handler) =>
          Effect.suspend(() => {
            const result = handler("12345")
            return Effect.isEffect(result) ? result : Effect.void
          }),
        writer: Effect.succeed((chunk) =>
          Socket.isCloseEvent(chunk)
            ? Deferred.succeed(closed, chunk).pipe(Effect.asVoid)
            : Effect.die("Expected the socket to close")
        )
      })
      const server = SocketServer.SocketServer.of({
        address: {
          _tag: "TcpAddress",
          hostname: "localhost",
          port: 0
        },
        run: (handler) =>
          Effect.andThen(handler(socket), Effect.never).pipe(
            Effect.catchAllCause((cause) => Effect.die(cause))
          )
      })
      const layer = RpcServer.layerProtocolSocketServer.pipe(
        Layer.provide(Layer.succeed(SocketServer.SocketServer, server)),
        Layer.provide(
          Layer.succeed(
            RpcSerialization.RpcSerialization,
            RpcSerialization.makeNdjson({ maxBufferSize: 4 })
          )
        )
      )
      yield* Layer.build(layer)
      const event = yield* Deferred.await(closed)
      assert.strictEqual(event.code, 1009)
    })))

  describe("jsonRpc", () => {
    const response = JSON.stringify({ jsonrpc: "2.0", id: 1, result: "ok" })
    const expected = {
      _tag: "Exit",
      requestId: "1",
      exit: { _tag: "Success", value: "ok" }
    }

    it("decodes a success response", () => {
      const decoded = RpcSerialization.jsonRpc().unsafeMake().decode(response)

      assert.deepStrictEqual(decoded, [expected])
    })

    it("ignores an inherited method", () => {
      polluteObjectPrototype("method", "attacker.evil")

      const decoded = RpcSerialization.jsonRpc().unsafeMake().decode(response)

      assert.deepStrictEqual(decoded, [expected])
    })

    it("ignores an inherited chunk marker", () => {
      polluteObjectPrototype("chunk", true)

      const decoded = RpcSerialization.jsonRpc().unsafeMake().decode(response)

      assert.deepStrictEqual(decoded, [expected])
    })

    it("ignores an inherited error", () => {
      polluteObjectPrototype("error", { _tag: "Defect", data: "pwn" })

      const decoded = RpcSerialization.jsonRpc().unsafeMake().decode(response)

      assert.deepStrictEqual(decoded, [expected])
    })
  })
})
