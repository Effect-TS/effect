import { RpcSerialization } from "@effect/rpc"
import { afterEach, assert, describe, it } from "@effect/vitest"

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

describe("RpcSerialization", () => {
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
