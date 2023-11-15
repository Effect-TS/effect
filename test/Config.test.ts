import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as ConfigSecret from "effect/ConfigSecret"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

describe.concurrent("Config", () => {
  describe.concurrent("withDefault", () => {
    it.effect("recovers from missing data error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key"),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map())
        const result = yield* $(configProvider.load(config))
        assert.strictEqual(result, 0)
      }))

    it.effect("does not recover from other errors", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key"),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isInvalidData(result.i0.error)
        )
      }))

    it.effect("does not recover from missing data and other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.zip(Config.integer("key2")),
          Config.withDefault<readonly [number, number]>([0, 0])
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isAnd(result.i0.error) &&
            ConfigError.isMissingData(result.i0.error.left) &&
            ConfigError.isInvalidData(result.i0.error.right)
        )
      }))

    it.effect("does not recover from missing data or other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.orElse(() => Config.integer("key2")),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isOr(result.i0.error) &&
            ConfigError.isMissingData(result.i0.error.left) &&
            result.i0.error.left.message === "Expected key1 to exist in the provided map" &&
            Equal.equals(Chunk.unsafeFromArray(result.i0.error.left.path), Chunk.of("key1")) &&
            ConfigError.isInvalidData(result.i0.error.right) &&
            result.i0.error.right.message === "Expected an integer value but received value" &&
            Equal.equals(Chunk.unsafeFromArray(result.i0.error.right.path), Chunk.of("key2"))
        )
      }))
  })

  describe.concurrent("optional", () => {
    it.effect("recovers from missing data error", () =>
      Effect.gen(function*($) {
        const config = Config.option(Config.integer("key"))
        const configProvider = ConfigProvider.fromMap(new Map())
        const result = yield* $(configProvider.load(config))
        assert.deepStrictEqual(result, Option.none())
      }))

    it.effect("does not recover from other errors", () =>
      Effect.gen(function*($) {
        const config = Config.option(Config.integer("key"))
        const configProvider = ConfigProvider.fromMap(new Map([["key", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isInvalidData(result.i0.error)
        )
      }))

    it.effect("does not recover from missing data and other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.zip(Config.integer("key2")),
          Config.option
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isAnd(result.i0.error) &&
            ConfigError.isMissingData(result.i0.error.left) &&
            ConfigError.isInvalidData(result.i0.error.right)
        )
      }))

    it.effect("does not recover from missing data or other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.orElse(() => Config.integer("key2")),
          Config.option
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(
          Effect.exit(configProvider.load(config))
        )
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.i0) &&
            ConfigError.isOr(result.i0.error) &&
            ConfigError.isMissingData(result.i0.error.left) &&
            result.i0.error.left.message === "Expected key1 to exist in the provided map" &&
            Equal.equals(Chunk.unsafeFromArray(result.i0.error.left.path), Chunk.of("key1")) &&
            ConfigError.isInvalidData(result.i0.error.right) &&
            result.i0.error.right.message === "Expected an integer value but received value" &&
            Equal.equals(Chunk.unsafeFromArray(result.i0.error.right.path), Chunk.of("key2"))
        )
      }))
  })

  describe.concurrent("Wrap", () => {
    it.effect("unwrap correctly builds config", () =>
      Effect.gen(function*($) {
        const wrapper = (
          _: Config.Config.Wrap<{
            key1: number
            list: ReadonlyArray<string>
            nested: {
              key2: string
            }
          }>
        ) => Config.unwrap(_)

        const config = wrapper({
          key1: Config.integer("key1"),
          list: Config.array(Config.string(), "items"),
          nested: {
            key2: Config.string("key2")
          }
        })

        const configProvider = ConfigProvider.fromMap(
          new Map([["key1", "123"], ["items", "one,two,three"], ["key2", "value"]])
        )
        const result = yield* $(configProvider.load(config))
        assert.deepStrictEqual(
          result,
          {
            key1: 123,
            list: ["one", "two", "three"],
            nested: {
              key2: "value"
            }
          }
        )
      }))
  })

  describe.concurrent("Secret", () => {
    it.it("chunk constructor", () => {
      const secret = ConfigSecret.fromChunk(Chunk.fromIterable("secret".split("")))
      assert.isTrue(Equal.equals(secret, ConfigSecret.fromString("secret")))
    })

    it.it("value", () => {
      const secret = ConfigSecret.fromChunk(Chunk.fromIterable("secret".split("")))
      const value = ConfigSecret.value(secret)
      assert.strictEqual(value, "secret")
    })

    it.it("toString", () => {
      const secret = ConfigSecret.fromString("secret")
      assert.strictEqual(`${secret}`, "ConfigSecret(<redacted>)")
    })

    it.it("wipe", () => {
      const secret = ConfigSecret.fromString("secret")
      ConfigSecret.unsafeWipe(secret)
      assert.isTrue(
        Equal.equals(
          ConfigSecret.value(secret),
          Array.from({ length: "secret".length }, () => String.fromCharCode(0)).join("")
        )
      )
    })
  })
})
