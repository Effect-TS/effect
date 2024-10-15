import * as Chunk from "effect/Chunk"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Redacted from "effect/Redacted"
import { assert, describe, it } from "vitest"

describe("Redacted", () => {
  it("chunk constructor", () => {
    const redacted = Redacted.make(Chunk.fromIterable("redacted".split("")))
    assert.isTrue(Equal.equals(redacted, Redacted.make(Chunk.fromIterable("redacted".split("")))))
  })

  it("value", () => {
    const redacted = Redacted.make(Chunk.fromIterable("redacted".split("")))
    const value = Redacted.value(redacted)
    assert.isTrue(Equal.equals(value, Chunk.fromIterable("redacted".split(""))))
  })

  it("pipe", () => {
    const value = { asd: 123 }
    const redacted = Redacted.make(value)
    const extractedValue = redacted.pipe(Redacted.value)
    assert.strictEqual(value, extractedValue)
  })

  it("toString", () => {
    const redacted = Redacted.make("redacted")
    assert.strictEqual(`${redacted}`, "<redacted>")
  })

  it("toJSON", () => {
    const redacted = Redacted.make("redacted")
    assert.strictEqual(JSON.stringify(redacted), "\"<redacted>\"")
  })

  it("unsafeWipe", () => {
    const redacted = Redacted.make("redacted")
    assert.isTrue(Redacted.unsafeWipe(redacted))
    assert.throw(() => Redacted.value(redacted), "Unable to get redacted value")
  })

  it("Equal", () => {
    assert.isTrue(Equal.equals(Redacted.make(1), Redacted.make(1)))
    assert.isFalse(Equal.equals(Redacted.make(1), Redacted.make(2)))
  })

  it("Hash", () => {
    assert.strictEqual(Hash.hash(Redacted.make(1)), Hash.hash(Redacted.make(1)))
    assert.notStrictEqual(Hash.hash(Redacted.make(1)), Hash.hash(Redacted.make(2)))
  })
})
