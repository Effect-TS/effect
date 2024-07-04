import * as Envelope from "@effect/cluster/Envelope"
import { RecipientAddress } from "@effect/cluster/RecipientAddress"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as PrimaryKey from "effect/PrimaryKey"

class Sample extends Schema.TaggedRequest<Sample>("Sample")(
  "Sample",
  Schema.String,
  Schema.Number,
  { id: Schema.Number, name: Schema.String }
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
      const sample1 = new Sample({ id: 1, name: "sample-1" })
      const sample2 = new Sample({ id: 1, name: "sample-1" })
      const a = Envelope.make(address1, sample1)
      const b = Envelope.make(address2, sample2)
      assert.isTrue(Equal.equals(a, b))
    })

    it("should determine if two envelopes are not equal", () => {
      const address1 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const address2 = new RecipientAddress({ recipientType: "User", entityId: "1" })
      const sample1 = new Sample({ id: 1, name: "sample-1" })
      const sample2 = new Sample({ id: 2, name: "sample-1" })
      const a = Envelope.make(address1, sample1)
      const b = Envelope.make(address2, sample2)
      assert.isFalse(Equal.equals(a, b))
    })
  })

  describe("Serialization and Deserialization", () => {
    it.effect("should serialize an envelope", () =>
      Effect.gen(function*() {
        const address = new RecipientAddress({ recipientType: "User", entityId: "1" })
        const sample = new Sample({ id: 1, name: "sample-1" })
        const envelope = Envelope.make(address, sample)
        const serialized = yield* Serializable.serialize(envelope)
        assert.deepStrictEqual(serialized, {
          address: {
            entityId: "1",
            recipientType: "User"
          },
          message: {
            _tag: "Sample",
            id: 1,
            name: "sample-1"
          }
        })
      }))

    it.effect("should deserialize an envelope", () =>
      Effect.gen(function*() {
      }))

    it.effect("should serialize the success value of an envelope's request", () =>
      Effect.gen(function*() {
      }))

    it.effect("should serialize the error value of an envelope's request", () =>
      Effect.gen(function*() {
      }))

    it.effect("should deserialize the success value of an envelope's request", () =>
      Effect.gen(function*() {
      }))

    it.effect("should deserialize the error value of an envelope's request", () =>
      Effect.gen(function*() {
      }))
  })
})
