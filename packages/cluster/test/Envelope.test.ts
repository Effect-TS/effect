import * as Envelope from "@effect/cluster/Envelope"
import { RecipientAddress } from "@effect/cluster/RecipientAddress"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Console } from "effect"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as PrimaryKey from "effect/PrimaryKey"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>("SampleMessage")(
  "SampleMessage",
  Schema.String,
  Schema.Number,
  {
    id: Schema.Number,
    name: Schema.String,
    date: Schema.Date
  }
) {
  [PrimaryKey.symbol]() {
    return `${this.id}`
  }
}

describe("Envelope", () => {
  describe("Equality", () => {
    it("should determine if two envelopes are equal", () => {
      const address1 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const address2 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const sample1 = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
      const sample2 = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
      const a = Envelope.make(address1, "1", sample1)
      const b = Envelope.make(address2, "1", sample2)
      assert.isTrue(Equal.equals(a, b))
    })

    it("should determine if two envelopes are not equal", () => {
      const address1 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const address2 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const sample1 = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
      const sample2 = new SampleMessage({ id: 2, name: "sample-1", date: new Date() })
      const a = Envelope.make(address1, "1", sample1)
      const b = Envelope.make(address2, "2", sample2)
      assert.isFalse(Equal.equals(a, b))
    })
  })

  describe("Serialization and Deserialization", () => {
    it.effect("should serialize an envelope", () =>
      Effect.gen(function*() {
        const date = new Date()
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serialize(envelope)
        assert.deepStrictEqual(serialized, {
          address: { entityId: "1", recipientType: "User" },
          messageId: "1",
          message: { _tag: "SampleMessage", id: 1, name: "sample-1", date: date.toISOString() }
        })
      }))

    it.effect("should deserialize an envelope", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serialize(envelope)
        const deserialized = yield* Serializable.deserialize(envelope, serialized)
        assert.deepStrictEqual(deserialized, envelope)
      }))

    it.effect("should serialize the success value of an envelope's request", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serializeSuccess(envelope, 1)
        assert.strictEqual(serialized, 1)
      }))

    it.effect("should serialize the error value of an envelope's request", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serializeFailure(envelope, "fail")
        assert.strictEqual(serialized, "fail")
      }))

    it.effect("should deserialize the success value of an envelope's request", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serializeSuccess(envelope, 1)
        const deserialized = yield* Serializable.deserializeSuccess(envelope, serialized)
        assert.strictEqual(deserialized, 1)
      }))

    it.effect("should deserialize the error value of an envelope's request", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serializeFailure(envelope, "fail")
        const deserialized = yield* Serializable.deserializeFailure(envelope, serialized)
        assert.strictEqual(deserialized, "fail")
      }))

    it.effect("should perform a serialization roundtrip", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new SampleMessage({ id: 1, name: "sample-1", date: new Date() })
        const envelope = Envelope.make(address, "1", sample)
        const serialized = yield* Serializable.serialize(envelope)
        const deserialized = yield* Schema.decode(Envelope.schema(SampleMessage))(serialized)
        assert.isTrue(Equal.equals(envelope, deserialized))
      }).pipe(Effect.tapErrorCause((cause) => Console.log(Cause.pretty(cause)))))
  })
})
