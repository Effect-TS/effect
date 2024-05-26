import * as Chunk from "effect/Chunk"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Hidden from "effect/Hidden"
import * as Secret from "effect/Secret"
import { assert, describe, it } from "vitest"

describe("Hidden", () => {
  it("chunk constructor", () => {
    const hidden = Hidden.make(Chunk.fromIterable("hidden".split("")))
    assert.isTrue(Equal.equals(hidden, Hidden.make(Chunk.fromIterable("hidden".split("")))))
  })

  it("value", () => {
    const hidden = Hidden.make(Chunk.fromIterable("hidden".split("")))
    const value = Hidden.value(hidden)
    assert.isTrue(Equal.equals(value, Chunk.fromIterable("hidden".split(""))))
    // assert.strictEqual(value, Chunk.fromIterable("hidden".split("")))
  })

  it("pipe", () => {
    const value = { asd: 123 }
    const hidden = Hidden.make(value)
    const extractedValue = hidden.pipe(Hidden.value)
    assert.strictEqual(value, extractedValue)
  })

  it("toString", () => {
    const hidden = Hidden.make("hidden")
    assert.strictEqual(`${hidden}`, "<hidden>")
  })

  it("toJSON", () => {
    const hidden = Hidden.make("hidden")
    assert.strictEqual(JSON.stringify(hidden), "\"<hidden>\"")
  })

  it("wipe", () => {
    const hidden = Hidden.make("hidden")
    Hidden.unsafeWipe(hidden)
    assert.isTrue(
      Equal.equals(
        Hidden.value(hidden),
        undefined
      )
    )
  })

  it("Equal", () => {
    assert.isTrue(Equal.equals(Hidden.make(1), Hidden.make(1)))
    assert.isFalse(Equal.equals(Hidden.make(1), Hidden.make(2)))
  })

  it("Hash", () => {
    assert.strictEqual(Hash.hash(Hidden.make(1)), Hash.hash(Hidden.make(1)))
    assert.notStrictEqual(Hash.hash(Hidden.make(1)), Hash.hash(Hidden.make(2)))
  })

  describe("Secret extends Hidden<string>", () => {
    it("Hidden.isHidden", () => {
      const secret = Secret.fromString("test")
      assert.isTrue(
        Hidden.isHidden(secret)
      )
    })
    it("Hidden.unsafeWipe", () => {
      const secret = Secret.fromString("test")
      assert.isTrue(
        Hidden.unsafeWipe(secret)
      )
    })
    it("Hidden.value", () => {
      const value = "test"
      const secret = Secret.fromString(value)
      assert.strictEqual(value, Hidden.value(secret))
    })
  })
})
