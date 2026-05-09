import { RpcSerialization } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"

describe("RpcSerialization", () => {
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
})
