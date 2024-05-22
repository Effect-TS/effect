import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Hash from "effect/Hash"
import * as Secret from "effect/Secret"
import { assert, describe, expect, it } from "vitest"

const assertSuccess = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(result).toStrictEqual(Exit.succeed(a))
}

describe("Secret", () => {
  describe("Config.secret", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.secret(), "ITEMS")
      assertSuccess(config, [["ITEMS", "a"]], [Secret.make("a")])
    })

    it("name != undefined", () => {
      const config = Config.secret("SECRET")
      assertSuccess(config, [["SECRET", "a"]], Secret.make("a"))
    })
  })

  it("chunk constructor", () => {
    const secret = Secret.make(Chunk.fromIterable("secret".split("")))
    assert.isTrue(Equal.equals(secret, Secret.make(Chunk.fromIterable("secret".split("")))))
  })

  it("value", () => {
    const secret = Secret.make(Chunk.fromIterable("secret".split("")))
    const value = Secret.value(secret)
    assert.isTrue(Equal.equals(value, Chunk.fromIterable("secret".split(""))))
    // assert.strictEqual(value, Chunk.fromIterable("secret".split("")))
  })

  it("pipe", () => {
    const value = { asd: 123 }
    const secret = Secret.make(value)
    const extractedValue = secret.pipe(Secret.value)
    assert.strictEqual(value, extractedValue)
  })

  it("toString", () => {
    const secret = Secret.make("secret")
    assert.strictEqual(`${secret}`, "Secret(<redacted>)")
  })

  it("toJSON", () => {
    const secret = Secret.make("secret")
    assert.strictEqual(JSON.stringify(secret), "\"<redacted>\"")
  })

  it("wipe", () => {
    const secret = Secret.make("secret")
    Secret.unsafeWipe(secret)
    assert.isTrue(
      Equal.equals(
        Secret.value(secret),
        undefined
      )
    )
  })

  it("Equal", () => {
    assert.isTrue(Equal.equals(Secret.make(1), Secret.make(1)))
    assert.isFalse(Equal.equals(Secret.make(1), Secret.make(2)))
  })

  it("Hash", () => {
    assert.strictEqual(Hash.hash(Secret.make(1)), Hash.hash(Secret.make(1)))
    assert.notStrictEqual(Hash.hash(Secret.make(1)), Hash.hash(Secret.make(2)))
  })
})
