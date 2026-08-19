import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { RpcSerialization } from "effect/unstable/rpc"

const responseExitSuccess = (requestId: string | number, value: unknown) => ({
  _tag: "Exit",
  requestId,
  exit: {
    _tag: "Success",
    value
  }
})

const objectPrototype = Object.prototype as Record<string, unknown>

const polluteObjectPrototype = (key: string, value: unknown) => {
  Object.defineProperty(objectPrototype, key, {
    configurable: true,
    value
  })
}

const decodeJsonRpcSuccess = () =>
  RpcSerialization.jsonRpc().makeUnsafe().decode("{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"ok\"}")

const expectedJsonRpcSuccess = [{
  _tag: "Exit",
  requestId: 1,
  exit: {
    _tag: "Success",
    value: "ok"
  }
}]

const assertMaxBufferSizeExceeded = (f: () => unknown, maxBufferSize: number) => {
  try {
    f()
    assert.fail("Expected MaxBufferSizeExceeded")
  } catch (error) {
    assert.instanceOf(error, RpcSerialization.MaxBufferSizeExceeded)
    assert.strictEqual(error.maxBufferSize, maxBufferSize)
  }
}

describe("RpcSerialization", () => {
  describe.sequential("jsonRpc inherited properties", () => {
    afterEach(() => {
      delete objectPrototype["method"]
      delete objectPrototype["error"]
      delete objectPrototype["chunk"]
    })

    it("decodes a success response with a clean prototype", () => {
      assert.deepStrictEqual(decodeJsonRpcSuccess(), expectedJsonRpcSuccess)
    })

    it("ignores an inherited method", () => {
      polluteObjectPrototype("method", "attacker.evil")
      assert.deepStrictEqual(decodeJsonRpcSuccess(), expectedJsonRpcSuccess)
    })

    it("ignores an inherited defect error", () => {
      polluteObjectPrototype("error", { _tag: "Defect", data: "pwn" })
      assert.deepStrictEqual(decodeJsonRpcSuccess(), expectedJsonRpcSuccess)
    })

    it("ignores an inherited chunk marker", () => {
      polluteObjectPrototype("chunk", true)
      assert.deepStrictEqual(decodeJsonRpcSuccess(), expectedJsonRpcSuccess)
    })

    it("ignores an inherited exit error", () => {
      polluteObjectPrototype("error", { _tag: "Cause", data: [] })
      assert.deepStrictEqual(decodeJsonRpcSuccess(), expectedJsonRpcSuccess)
    })
  })

  it("json decode keeps array payloads flat", () => {
    const parser = RpcSerialization.json.makeUnsafe()
    const decoded = parser.decode("[1,2,3]")
    assert.strictEqual(decoded.length, 3)
    assert.deepStrictEqual(decoded, [1, 2, 3])
  })

  it("json decode wraps non-array payloads", () => {
    const parser = RpcSerialization.json.makeUnsafe()
    const decoded = parser.decode("{\"a\":1}")
    assert.strictEqual(decoded.length, 1)
    assert.deepStrictEqual(decoded, [{ a: 1 }])
  })

  it("ndjson fails when an unterminated frame exceeds maxBufferSize", () => {
    const parser = RpcSerialization.makeNdjson({ maxBufferSize: 4 }).makeUnsafe()

    assert.deepStrictEqual(parser.decode("12"), [])
    assert.deepStrictEqual(parser.decode("34"), [])
    assertMaxBufferSizeExceeded(() => parser.decode("5"), 4)
  })

  it("ndjson allows an unbounded incomplete frame", () => {
    const parser = RpcSerialization.makeNdjson({ maxBufferSize: "unbounded" }).makeUnsafe()

    assert.deepStrictEqual(parser.decode("x".repeat(1024)), [])
  })

  it("ndjson decodes a multibyte character split across byte chunks", () => {
    const parser = RpcSerialization.ndjson.makeUnsafe()
    const message = { value: "\u20ac" }
    const encoded = parser.encode(message)
    assert(typeof encoded === "string")
    const bytes = new TextEncoder().encode(encoded)
    const split = bytes.indexOf(0xe2) + 1

    assert.deepStrictEqual(parser.decode(bytes.slice(0, split)), [])
    assert.deepStrictEqual(parser.decode(bytes.slice(split)), [message])
  })

  it.effect("layerNdjsonWith forwards maxBufferSize to its decoder", () =>
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const parser = serialization.makeUnsafe()

      assert.deepStrictEqual(parser.decode("12"), [])
      assert.deepStrictEqual(parser.decode("34"), [])
      assertMaxBufferSizeExceeded(() => parser.decode("5"), 4)
    }).pipe(
      Effect.provide(RpcSerialization.layerNdjsonWith({ maxBufferSize: 4 }))
    ))

  it("ndJsonRpc forwards maxBufferSize to its ndjson framing parser", () => {
    const parser = RpcSerialization.ndJsonRpc({ maxBufferSize: 4 }).makeUnsafe()

    assert.deepStrictEqual(parser.decode("12"), [])
    assert.deepStrictEqual(parser.decode("34"), [])
    assert.throws(() => parser.decode("5"), RpcSerialization.MaxBufferSizeExceeded)
  })

  it("jsonRpc encodes a non-batched single response array as an object", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"users.get\"}")
    assert.strictEqual(decoded.length, 1)

    const encoded = parser.encode([responseExitSuccess("1", { id: 1 })])
    assert(encoded !== undefined)

    const message = JSON.parse(encoded as string)
    assert.strictEqual(Array.isArray(message), false)
    assert.deepStrictEqual(message, {
      jsonrpc: "2.0",
      id: "1",
      result: {
        id: 1
      }
    })
  })

  it("jsonRpc encodes batched responses as an array", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode(
      "[{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"users.get\"},{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"users.list\"}]"
    )
    assert.strictEqual(decoded.length, 2)

    const encoded = parser.encode([
      responseExitSuccess("1", "one"),
      responseExitSuccess(2, "two")
    ])
    console.log(encoded)
    assert(encoded !== undefined)

    const message = JSON.parse(encoded as string)
    assert.strictEqual(Array.isArray(message), true)
    assert.deepStrictEqual(message, [
      {
        jsonrpc: "2.0",
        id: "1",
        result: "one"
      },
      {
        jsonrpc: "2.0",
        id: 2,
        result: "two"
      }
    ])
  })

  it("jsonRpc preserves id 0 across decode and encode", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode("{\"jsonrpc\":\"2.0\",\"id\":0,\"method\":\"users.get\"}")
    assert.deepStrictEqual(decoded, [{
      _tag: "Request",
      id: 0,
      tag: "users.get",
      payload: null,
      headers: []
    }])

    const encoded = parser.encode({
      _tag: "Request",
      id: 0,
      tag: "users.get",
      payload: null,
      headers: []
    })
    assert.strictEqual(
      encoded,
      "{\"jsonrpc\":\"2.0\",\"method\":\"users.get\",\"params\":null,\"id\":0}"
    )
  })

  it("jsonRpc maps null id to internal notification sentinel", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode("{\"jsonrpc\":\"2.0\",\"id\":null,\"method\":\"users.get\"}")
    assert.deepStrictEqual(decoded, [{
      _tag: "Request",
      id: "",
      tag: "users.get",
      payload: null,
      headers: []
    }])
  })

  it("jsonRpc preserves empty string id across decode and encode", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode("{\"jsonrpc\":\"2.0\",\"id\":\"\",\"method\":\"users.get\"}")
    assert.deepStrictEqual(decoded, [{
      _tag: "Request",
      id: "",
      tag: "users.get",
      payload: null,
      headers: []
    }])

    const encoded = parser.encode({
      _tag: "Request",
      id: "",
      tag: "users.get",
      payload: null,
      headers: []
    })
    assert.strictEqual(
      encoded,
      "{\"jsonrpc\":\"2.0\",\"method\":\"users.get\",\"params\":null,\"id\":\"\"}"
    )
  })

  it("jsonRpc encodes a notification without an id", () => {
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    const decoded = parser.decode("{\"jsonrpc\":\"2.0\",\"method\":\"notifications/message\"}")
    assert.deepStrictEqual(decoded, [{
      _tag: "Request",
      id: "",
      tag: "notifications/message",
      payload: null,
      headers: [],
      isNotification: true
    }])

    const encoded = parser.encode({
      _tag: "Request",
      id: "",
      tag: "notifications/message",
      payload: { level: "info" },
      headers: [["x-test", "value"]],
      traceId: "trace",
      spanId: "span",
      sampled: true,
      isNotification: true
    })
    assert.strictEqual(
      encoded,
      "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/message\",\"params\":{\"level\":\"info\"},\"headers\":[[\"x-test\",\"value\"]],\"traceId\":\"trace\",\"spanId\":\"span\",\"sampled\":true}"
    )
  })

  it("msgPack roundtrips an encoded RPC request envelope", () => {
    const parser = RpcSerialization.msgPack.makeUnsafe()
    const payload = { _tag: "Request", id: 1, method: "echo" }
    const encoded = parser.encode(payload)
    const decoded = parser.decode(encoded as Uint8Array)
    assert.strictEqual(decoded.length, 1)
    assert.deepStrictEqual(decoded[0], payload)
  })

  it("makeMsgPack with useRecords false roundtrips an encoded RPC request envelope", () => {
    const parser = RpcSerialization.makeMsgPack({ useRecords: false }).makeUnsafe()
    const payload = { _tag: "Request", id: 1, method: "echo" }
    const encoded = parser.encode(payload)
    const decoded = parser.decode(encoded as Uint8Array)
    assert.strictEqual(decoded.length, 1)
    assert.deepStrictEqual(decoded[0], payload)
  })

  it("makeMsgPack with useRecords false handles nested objects with repeated structures", () => {
    const parser = RpcSerialization.makeMsgPack({ useRecords: false }).makeUnsafe()
    const payload = {
      _tag: "Chunk",
      requestId: "1",
      values: [
        responseExitSuccess("1", { _tag: "Ok", data: "a" }),
        responseExitSuccess("2", { _tag: "Ok", data: "b" }),
        responseExitSuccess("3", { _tag: "Ok", data: "c" }),
        responseExitSuccess("4", { _tag: "Ok", data: "d" })
      ]
    }
    const encoded = parser.encode(payload)
    const decoded = parser.decode(encoded as Uint8Array)
    assert.strictEqual(decoded.length, 1)
    assert.deepStrictEqual(decoded[0], payload)
  })

  it("makeMsgPack fails when incomplete frames exceed maxBufferSize", () => {
    const parser = RpcSerialization.makeMsgPack({ maxBufferSize: 2 }).makeUnsafe()
    const incompleteFrame = Uint8Array.of(0xd9)

    assert.deepStrictEqual(parser.decode(incompleteFrame), [])
    assert.deepStrictEqual(parser.decode(incompleteFrame), [])
    assertMaxBufferSizeExceeded(() => parser.decode(incompleteFrame), 2)
  })

  it("makeMsgPack allows an unbounded incomplete frame", () => {
    const parser = RpcSerialization.makeMsgPack({ maxBufferSize: "unbounded" }).makeUnsafe()
    const incompleteFrame = Uint8Array.of(0xd9)

    for (let i = 0; i < 20; i++) {
      assert.deepStrictEqual(parser.decode(incompleteFrame), [])
    }
  })

  it.effect("layerMsgPackWith forwards maxBufferSize to its decoder", () =>
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const parser = serialization.makeUnsafe()
      const incompleteFrame = Uint8Array.of(0xd9)

      assert.deepStrictEqual(parser.decode(incompleteFrame), [])
      assert.deepStrictEqual(parser.decode(incompleteFrame), [])
      assertMaxBufferSizeExceeded(() => parser.decode(incompleteFrame), 2)
    }).pipe(
      Effect.provide(RpcSerialization.layerMsgPackWith({ maxBufferSize: 2 }))
    ))
})
