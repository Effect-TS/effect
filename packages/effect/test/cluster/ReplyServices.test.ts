import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import { Reply } from "effect/unstable/cluster"
import { RpcSerialization } from "effect/unstable/rpc"
import * as F from "./ReplyServices.fixture.ts"

describe("Reply service direction runtime controls", () => {
  it.effect("decodes and encodes success through the real asymmetric codec", () =>
    Effect.gen(function*() {
      const decoded = yield* Schema.decodeEffect(F.asymmetricCodec)(F.wire)
      assert.deepStrictEqual(decoded, new Reply.WithExit({ requestId: F.requestId, id: F.id, exit: Exit.succeed(42) }))
      const encoded = yield* Schema.encodeEffect(F.asymmetricCodec)(decoded)
      assert.deepStrictEqual(encoded, F.wire)
      assert.strictEqual(
        JSON.stringify(encoded),
        "{\"_tag\":\"WithExit\",\"requestId\":\"1\",\"id\":\"2\",\"exit\":{\"_tag\":\"Success\",\"value\":21}}"
      )
    }).pipe(Effect.provideContext(F.services)))

  it.effect("decodes and encodes typed errors through their separate services", () =>
    Effect.gen(function*() {
      const decoded = yield* Schema.decodeEffect(F.asymmetricCodec)(F.errorWire)
      assert.deepStrictEqual(
        decoded,
        new Reply.WithExit({ requestId: F.requestId, id: F.id, exit: Exit.fail("decoded:boom") })
      )
      const encoded = yield* Schema.encodeEffect(F.asymmetricCodec)(F.asymmetricErrorValue)
      assert.deepStrictEqual(encoded, {
        ...F.errorWire,
        exit: { _tag: "Failure", cause: [{ _tag: "Fail", error: "encoded:boom" }] }
      })
    }).pipe(Effect.provideContext(F.services)))

  it.effect("direct WithExit codecFor matches the wrapper", () =>
    Effect.gen(function*() {
      const direct = RpcSerialization.json.codecFor(Reply.WithExit.schema(F.asymmetricRpc))
      const decoded = yield* Schema.decodeEffect(direct)(F.wire)
      assert.deepStrictEqual(decoded, yield* Schema.decodeEffect(F.asymmetricCodec)(F.wire))
      assert.deepStrictEqual(yield* Schema.encodeEffect(direct)(decoded), F.wire)
    }).pipe(Effect.provideContext(F.services)))

  it.effect("stream chunks use success services and preserve wire values", () =>
    Effect.gen(function*() {
      const wire: Reply.ChunkEncoded = { _tag: "Chunk", requestId: "1", id: "2", sequence: 0, values: [21, 10] }
      const decoded = yield* Schema.decodeEffect(F.streamCodec)(wire)
      assert.deepStrictEqual(
        decoded,
        new Reply.Chunk({ requestId: F.requestId, id: F.id, sequence: 0, values: [42, 20] })
      )
      assert.deepStrictEqual(yield* Schema.encodeEffect(F.streamCodec)(decoded), wire)
    }).pipe(Effect.provideContext(F.services)))

  it("service-free replies round trip synchronously", () => {
    const decoded = Schema.decodeSync(F.plainCodec)(F.wire)
    assert.deepStrictEqual(Schema.encodeSync(F.plainCodec)(decoded), F.wire)
  })

  it("caches by both RPC and codecFor identity", () => {
    assert.strictEqual(Reply.Reply(F.asymmetricRpc, RpcSerialization.json.codecFor), F.asymmetricCodec)
    const other: RpcSerialization.CodecFor = (schema) => RpcSerialization.json.codecFor(schema)
    const codec = Reply.Reply(F.asymmetricRpc, other)
    assert.notStrictEqual(codec, F.asymmetricCodec)
    assert.strictEqual(Reply.Reply(F.asymmetricRpc, other), codec)
    assert.isFalse(Object.is(F.asymmetricCodec, F.plainCodec))
  })
})
