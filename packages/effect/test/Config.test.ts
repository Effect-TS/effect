import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Secret from "effect/Secret"
import { assert, describe, expect, it } from "vitest"

const assertFailure = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  error: ConfigError.ConfigError
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(result).toStrictEqual(Exit.fail(error))
}

const assertSuccess = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(result).toStrictEqual(Exit.succeed(a))
}

const assertEqualSuccess = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(Equal.equals(Exit.succeed(a), result)).toBe(true)
}

describe("Config", () => {
  describe("boolean", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.boolean(), "ITEMS")
      assertSuccess(config, [["ITEMS", "true"]], [true])
      assertFailure(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], "Expected a boolean value but received value")
      )
    })

    it("name != undefined", () => {
      const config = Config.boolean("BOOL")
      assertSuccess(config, [["BOOL", "true"]], true)
      assertSuccess(config, [["BOOL", "yes"]], true)
      assertSuccess(config, [["BOOL", "on"]], true)
      assertSuccess(config, [["BOOL", "1"]], true)
      assertSuccess(config, [["BOOL", "false"]], false)
      assertSuccess(config, [["BOOL", "no"]], false)
      assertSuccess(config, [["BOOL", "off"]], false)
      assertSuccess(config, [["BOOL", "0"]], false)

      assertFailure(config, [], ConfigError.MissingData(["BOOL"], "Expected BOOL to exist in the provided map"))
      assertFailure(
        config,
        [["BOOL", "value"]],
        ConfigError.InvalidData(["BOOL"], "Expected a boolean value but received value")
      )
    })
  })

  describe("nonEmptyString", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.nonEmptyString(), "ITEMS")
      assertSuccess(config, [["ITEMS", "foo"]], ["foo"])
      assertFailure(config, [["ITEMS", ""]], ConfigError.MissingData(["ITEMS"], "Expected a non-empty string"))
    })

    it("name != undefined", () => {
      const config = Config.nonEmptyString("NON_EMPTY_STRING")
      assertSuccess(config, [["NON_EMPTY_STRING", "foo"]], "foo")
      assertSuccess(config, [["NON_EMPTY_STRING", " "]], " ")
      assertFailure(
        config,
        [["NON_EMPTY_STRING", ""]],
        ConfigError.MissingData(["NON_EMPTY_STRING"], "Expected a non-empty string")
      )
    })
  })

  describe("number", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.number(), "ITEMS")
      assertSuccess(config, [["ITEMS", "1"]], [1])
      assertFailure(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], "Expected a number value but received value")
      )
    })

    it("name != undefined", () => {
      const config = Config.number("NUMBER")
      assertSuccess(config, [["NUMBER", "1"]], 1)
      assertSuccess(config, [["NUMBER", "1.2"]], 1.2)
      assertSuccess(config, [["NUMBER", "-1"]], -1)
      assertSuccess(config, [["NUMBER", "-1.2"]], -1.2)
      assertSuccess(config, [["NUMBER", "0"]], 0)
      assertSuccess(config, [["NUMBER", "-0"]], -0)

      assertFailure(config, [], ConfigError.MissingData(["NUMBER"], "Expected NUMBER to exist in the provided map"))
      assertFailure(
        config,
        [["NUMBER", "value"]],
        ConfigError.InvalidData(["NUMBER"], "Expected a number value but received value")
      )
    })
  })

  describe("literal", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.literal("a", "b")(), "ITEMS")
      assertSuccess(config, [["ITEMS", "a"]], ["a"])
      assertFailure(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], "Expected one of (a, b) but received value")
      )
    })

    it("name != undefined", () => {
      const config = Config.literal("a", 0, -0.3, BigInt(5), false, null)("LITERAL")
      assertSuccess(config, [["LITERAL", "a"]], "a")
      assertSuccess(config, [["LITERAL", "0"]], 0)
      assertSuccess(config, [["LITERAL", "-0.3"]], -0.3)
      assertSuccess(config, [["LITERAL", "5"]], BigInt(5))
      assertSuccess(config, [["LITERAL", "false"]], false)
      assertSuccess(config, [["LITERAL", "null"]], null)

      assertFailure(config, [], ConfigError.MissingData(["LITERAL"], "Expected LITERAL to exist in the provided map"))
      assertFailure(
        config,
        [["LITERAL", "value"]],
        ConfigError.InvalidData(["LITERAL"], "Expected one of (a, 0, -0.3, 5, false, null) but received value")
      )
    })
  })

  describe("date", () => {
    it("name = undefined", () => {
      const config = Config.date()
      assertSuccess(config, [["", "0"]], new Date(Date.parse("0")))
      assertFailure(
        config,
        [["", "value"]],
        ConfigError.InvalidData([], "Expected a Date value but received value")
      )
    })

    it("name != undefined", () => {
      const config = Config.date("DATE")
      assertSuccess(config, [["DATE", "0"]], new Date(Date.parse("0")))

      assertFailure(config, [], ConfigError.MissingData(["DATE"], "Expected DATE to exist in the provided map"))
      assertFailure(
        config,
        [["DATE", "value"]],
        ConfigError.InvalidData(["DATE"], "Expected a Date value but received value")
      )
    })
  })

  it("fail", () => {
    const config = Config.fail("failure message")
    assertFailure(config, [], ConfigError.MissingData([], "failure message"))
  })

  it("mapAttempt", () => {
    const config = Config.string("STRING").pipe(Config.mapAttempt((s) => {
      const n = parseFloat(s)
      if (Number.isNaN(n)) {
        throw new Error("invalid number")
      }
      if (n < 0) {
        throw "invalid negative number"
      }
      return n
    }))
    assertSuccess(config, [["STRING", "1"]], 1)
    assertFailure(
      config,
      [["STRING", "value"]],
      ConfigError.InvalidData(["STRING"], "invalid number")
    )
    assertFailure(
      config,
      [["STRING", "-1"]],
      ConfigError.InvalidData(["STRING"], "invalid negative number")
    )
    assertFailure(config, [], ConfigError.MissingData(["STRING"], "Expected STRING to exist in the provided map"))
  })

  describe("logLevel", () => {
    it("name = undefined", () => {
      const config = Config.logLevel()
      assertSuccess(config, [["", "DEBUG"]], LogLevel.Debug)

      assertFailure(config, [["", "-"]], ConfigError.InvalidData([], "Expected a log level but received -"))
    })

    it("name != undefined", () => {
      const config = Config.logLevel("LOG_LEVEL")
      assertSuccess(config, [["LOG_LEVEL", "DEBUG"]], LogLevel.Debug)

      assertFailure(
        config,
        [["LOG_LEVEL", "-"]],
        ConfigError.InvalidData(["LOG_LEVEL"], "Expected a log level but received -")
      )
    })
  })

  describe("duration", () => {
    it("name = undefined", () => {
      const config = Config.duration()
      assertSuccess(config, [["", "10 seconds"]], Duration.decode("10 seconds"))

      assertFailure(config, [["", "-"]], ConfigError.InvalidData([], "Expected a duration but received -"))
    })

    it("name != undefined", () => {
      const config = Config.duration("DURATION")
      assertSuccess(config, [["DURATION", "10 seconds"]], Duration.decode("10 seconds"))

      assertFailure(
        config,
        [["DURATION", "-"]],
        ConfigError.InvalidData(["DURATION"], "Expected a duration but received -")
      )
    })
  })

  describe("validate", () => {
    it("should preserve the original path", () => {
      const flat = Config.number("NUMBER").pipe(
        Config.validate({
          message: "a positive number",
          validation: (n) => n >= 0
        })
      )
      assertSuccess(flat, [["NUMBER", "1"]], 1)
      assertSuccess(flat, [["NUMBER", "1.2"]], 1.2)
      assertFailure(
        flat,
        [["NUMBER", "-1"]],
        ConfigError.InvalidData(["NUMBER"], "a positive number")
      )

      const nested = flat.pipe(
        Config.nested("NESTED1")
      )
      assertSuccess(nested, [["NESTED1.NUMBER", "1"]], 1)
      assertSuccess(nested, [["NESTED1.NUMBER", "1.2"]], 1.2)
      assertFailure(
        nested,
        [["NESTED1.NUMBER", "-1"]],
        ConfigError.InvalidData(["NESTED1", "NUMBER"], "a positive number")
      )

      const doubleNested = nested.pipe(Config.nested("NESTED2"))
      assertSuccess(doubleNested, [["NESTED2.NESTED1.NUMBER", "1"]], 1)
      assertSuccess(doubleNested, [["NESTED2.NESTED1.NUMBER", "1.2"]], 1.2)
      assertFailure(
        doubleNested,
        [["NESTED2.NESTED1.NUMBER", "-1"]],
        ConfigError.InvalidData(["NESTED2", "NESTED1", "NUMBER"], "a positive number")
      )
    })
  })

  describe("withDefault", () => {
    it("recovers from missing data error", () => {
      const config = pipe(
        Config.integer("key"),
        Config.withDefault(0)
      )
      // available data
      assertSuccess(config, [["key", "1"]], 1)
      // missing data
      assertSuccess(config, [], 0)
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key"),
        Config.withDefault(0)
      )
      assertSuccess(config, [["key", "1"]], 1)
      assertFailure(
        config,
        [["key", "value"]],
        // available data but not an integer
        ConfigError.InvalidData(["key"], "Expected an integer value but received value")
      )
    })

    it("does not recover from missing data and other error", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.zip(Config.integer("key2")),
        Config.withDefault([0, 0])
      )
      assertSuccess(config, [], [0, 0])
      assertSuccess(config, [["key1", "1"], ["key2", "2"]], [1, 2])
      assertFailure(
        config,
        [["key2", "value"]],
        ConfigError.And(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], "Expected an integer value but received value")
        )
      )
    })

    it("does not recover from missing data or other error", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.orElse(() => Config.integer("key2")),
        Config.withDefault(0)
      )
      assertSuccess(config, [], 0)
      assertSuccess(config, [["key1", "1"]], 1)
      assertSuccess(config, [["key2", "2"]], 2)
      assertFailure(
        config,
        [["key2", "value"]],
        ConfigError.Or(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], "Expected an integer value but received value")
        )
      )
    })
  })

  describe("option", () => {
    it("recovers from missing data error", () => {
      const config = Config.option(Config.integer("key"))
      assertSuccess(config, [], Option.none())
      assertSuccess(config, [["key", "1"]], Option.some(1))
    })

    it("does not recover from other errors", () => {
      const config = Config.option(Config.integer("key"))
      assertFailure(
        config,
        [["key", "value"]],
        ConfigError.InvalidData(["key"], "Expected an integer value but received value")
      )
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.zip(Config.integer("key2")),
        Config.option
      )
      assertSuccess(config, [["key1", "1"], ["key2", "2"]], Option.some([1, 2]))
      assertFailure(
        config,
        [["key1", "value"]],
        ConfigError.And(
          ConfigError.InvalidData(["key1"], "Expected an integer value but received value"),
          ConfigError.MissingData(["key2"], "Expected key2 to exist in the provided map")
        )
      )
      assertFailure(
        config,
        [["key2", "value"]],
        ConfigError.And(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], "Expected an integer value but received value")
        )
      )
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.orElse(() => Config.integer("key2")),
        Config.option
      )
      assertSuccess(config, [["key1", "1"]], Option.some(1))
      assertSuccess(config, [["key1", "value"], ["key2", "2"]], Option.some(2))
      assertFailure(
        config,
        [["key2", "value"]],
        ConfigError.Or(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], "Expected an integer value but received value")
        )
      )
    })
  })

  describe("Wrap", () => {
    it("unwrap correctly builds config", () => {
      const wrapper = (
        _: Config.Config.Wrap<{
          key1: number
          list: ReadonlyArray<number>
          option: Option.Option<number>
          secret: Redacted.Redacted
          nested?:
            | Partial<{
              key2: string
            }>
            | undefined
        }>
      ) => Config.unwrap(_)

      const config = wrapper({
        key1: Config.integer("key1"),
        list: Config.array(Config.integer(), "items"),
        option: Config.option(Config.integer("option")),
        secret: Config.redacted("secret"),
        nested: {
          key2: Config.string("key2")
        }
      })
      assertSuccess(config, [["key1", "123"], ["items", "1,2,3"], ["option", "123"], ["secret", "sauce"], [
        "key2",
        "value"
      ]], {
        key1: 123,
        list: [1, 2, 3],
        option: Option.some(123),
        secret: Redacted.make("sauce"),
        nested: {
          key2: "value"
        }
      })
      assertFailure(
        config,
        [["key1", "123"], ["items", "1,value,3"], ["option", "123"], ["secret", "sauce"], ["key2", "value"]],
        ConfigError.InvalidData(["items"], "Expected an integer value but received value")
      )
    })
  })

  it("sync", () => {
    const config = Config.sync(() => 1)
    assertSuccess(config, [], 1)
  })

  describe("all", () => {
    describe("tuple", () => {
      it("length = 0", () => {
        const config = Config.all([])
        assertSuccess(config, [], [])
      })

      it("length = 1", () => {
        const config = Config.all([Config.number("NUMBER")])
        assertSuccess(config, [["NUMBER", "1"]], [1])
      })

      it("length > 1", () => {
        const config = Config.all([Config.number("NUMBER"), Config.boolean("BOOL")])
        assertSuccess(config, [["NUMBER", "1"], ["BOOL", "true"]], [1, true])
        assertFailure(
          config,
          [["NUMBER", "value"], ["BOOL", "true"]],
          ConfigError.InvalidData(["NUMBER"], "Expected a number value but received value")
        )
        assertFailure(
          config,
          [["NUMBER", "1"], ["BOOL", "value"]],
          ConfigError.InvalidData(["BOOL"], "Expected a boolean value but received value")
        )
      })
    })

    it("iterable", () => {
      const set = new Set([Config.number("NUMBER"), Config.boolean("BOOL")])
      const config = Config.all(set)
      assertSuccess(config, [["NUMBER", "1"], ["BOOL", "true"]], [1, true])
      assertFailure(
        config,
        [["NUMBER", "value"], ["BOOL", "true"]],
        ConfigError.InvalidData(["NUMBER"], "Expected a number value but received value")
      )
      assertFailure(
        config,
        [["NUMBER", "1"], ["BOOL", "value"]],
        ConfigError.InvalidData(["BOOL"], "Expected a boolean value but received value")
      )
    })
  })

  describe("Config.redacted", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.redacted(), "ITEMS")
      assertSuccess(config, [["ITEMS", "a"]], [Redacted.make("a")])
    })

    it("name != undefined", () => {
      const config = Config.redacted("SECRET")
      assertEqualSuccess(config, [["SECRET", "a"]], Redacted.make("a"))
    })

    it("can wrap generic Config", () => {
      const config = Config.redacted(Config.integer("NUM"))
      assertEqualSuccess(config, [["NUM", "2"]], Redacted.make(2))
    })
  })

  describe("Secret", () => {
    describe("Config.secret", () => {
      it("name = undefined", () => {
        const config = Config.array(Config.secret(), "ITEMS")
        assertSuccess(config, [["ITEMS", "a"]], [Secret.fromString("a")])
      })

      it("name != undefined", () => {
        const config = Config.secret("SECRET")
        assertEqualSuccess(config, [["SECRET", "a"]], Secret.fromString("a"))
      })
    })

    it("chunk constructor", () => {
      const secret = Secret.fromIterable(Chunk.fromIterable("secret".split("")))
      assert.isTrue(Equal.equals(secret, Secret.fromString("secret")))
    })

    it("value", () => {
      const secret = Secret.fromIterable(Chunk.fromIterable("secret".split("")))
      const value = Secret.value(secret)
      assert.strictEqual(value, "secret")
    })

    it("toString", () => {
      const secret = Secret.fromString("secret")
      assert.strictEqual(`${secret}`, "Secret(<redacted>)")
    })

    it("toJSON", () => {
      const secret = Secret.fromString("secret")
      assert.strictEqual(JSON.stringify(secret), "\"<redacted>\"")
    })

    it("wipe", () => {
      const secret = Secret.fromString("secret")
      Secret.unsafeWipe(secret)
      assert.isTrue(
        Equal.equals(
          Secret.value(secret),
          Array.from({ length: "secret".length }, () => String.fromCharCode(0)).join("")
        )
      )
    })
  })

  it("withDescription", () => {
    const config = Config.number("NUMBER").pipe(Config.withDescription("my description"))
    expect("description" in config).toBe(true)
  })

  describe("hashSet", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.hashSet(Config.string()), "ITEMS")
      assertSuccess(config, [["ITEMS", "a,b,c"]], [HashSet.make("a", "b", "c")])
    })

    it("name != undefined", () => {
      const config = Config.hashSet(Config.string(), "HASH_SET")
      assertSuccess(config, [["HASH_SET", "a,b,c"]], HashSet.make("a", "b", "c"))
    })
  })

  it("can be yielded", () => {
    const result = Effect.runSync(Effect.withConfigProvider(
      Config.string("STRING"),
      ConfigProvider.fromMap(new Map([["STRING", "value"]]))
    ))
    assert.strictEqual(result, "value")
  })

  it("array nested", () => {
    const result = Config.array(Config.number(), "ARRAY").pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([["NESTED.ARRAY", "1,2,3"]])).pipe(
          ConfigProvider.nested("NESTED")
        )
      ),
      Effect.runSync
    )
    assert.deepStrictEqual(result, [1, 2, 3])
  })
})
