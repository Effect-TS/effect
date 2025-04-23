import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual, throws } from "@effect/vitest/utils"
import { Chunk, Equal, Hash, Redacted, Secret } from "effect"

describe("Redacted", () => {
  it("chunk constructor", () => {
    const redacted = Redacted.make(Chunk.fromIterable("redacted".split("")))
    assertTrue(Equal.equals(redacted, Redacted.make(Chunk.fromIterable("redacted".split("")))))
  })

  it("value", () => {
    const redacted = Redacted.make(Chunk.fromIterable("redacted".split("")))
    const value = Redacted.value(redacted)
    assertTrue(Equal.equals(value, Chunk.fromIterable("redacted".split(""))))
  })

  it("pipe", () => {
    const value = { asd: 123 }
    const redacted = Redacted.make(value)
    const extractedValue = redacted.pipe(Redacted.value)
    strictEqual(value, extractedValue)
  })

  it("toString", () => {
    const redacted = Redacted.make("redacted")
    strictEqual(`${redacted}`, "<redacted>")
  })

  it("toJSON", () => {
    const redacted = Redacted.make("redacted")
    strictEqual(JSON.stringify(redacted), "\"<redacted>\"")
  })

  it("unsafeWipe", () => {
    const redacted = Redacted.make("redacted")
    assertTrue(Redacted.unsafeWipe(redacted))
    throws(() => Redacted.value(redacted), new Error("Unable to get redacted value"))
  })

  it("Equal", () => {
    assertTrue(Equal.equals(Redacted.make(1), Redacted.make(1)))
    assertFalse(Equal.equals(Redacted.make(1), Redacted.make(2)))
  })

  it("Hash", () => {
    strictEqual(Hash.hash(Redacted.make(1)), Hash.hash(Redacted.make(1)))
    assertTrue(Hash.hash(Redacted.make(1)) !== Hash.hash(Redacted.make(2)))
  })

  describe("Secret extends Redacted", () => {
    it("Redacted.isRedacted", () => {
      const secret = Secret.fromString("test")
      assertTrue(
        Redacted.isRedacted(secret)
      )
    })
    it("Redacted.unsafeWipe", () => {
      const secret = Secret.fromString("test")
      assertTrue(Redacted.unsafeWipe(secret))
    })
    it("Redacted.value", () => {
      const value = "test"
      const secret = Secret.fromString(value)
      strictEqual(value, Redacted.value(secret))
    })
  })
})
