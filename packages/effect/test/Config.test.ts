import { describe, it } from "@effect/vitest"
import { assertFailure, assertSuccess, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Brand,
  Cause,
  Chunk,
  Config,
  ConfigError,
  ConfigProvider,
  Duration,
  Effect,
  Equal,
  HashSet,
  LogLevel,
  Option,
  pipe,
  Redacted,
  Secret
} from "effect"

type Str = Brand.Branded<string, "Str">
const Str = Brand.refined<Str>(
  (n) => n.length > 2,
  (n) => Brand.error(`Brand: Expected ${n} to be longer than 2`)
)

const assertConfigError = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  error: ConfigError.ConfigError
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSyncExit(configProvider.load(config))
  assertFailure(result, Cause.fail(error))
}

const assertConfig = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSyncExit(configProvider.load(config))
  assertSuccess(result, a)
}

describe("Config", () => {
  describe("boolean", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.boolean(), "ITEMS")
      assertConfig(config, [["ITEMS", "true"]], [true])
      assertConfigError(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], `Expected a boolean value but received "value"`)
      )
    })

    it("name != undefined", () => {
      const config = Config.boolean("BOOL")
      assertConfig(config, [["BOOL", "true"]], true)
      assertConfig(config, [["BOOL", "yes"]], true)
      assertConfig(config, [["BOOL", "on"]], true)
      assertConfig(config, [["BOOL", "1"]], true)
      assertConfig(config, [["BOOL", "false"]], false)
      assertConfig(config, [["BOOL", "no"]], false)
      assertConfig(config, [["BOOL", "off"]], false)
      assertConfig(config, [["BOOL", "0"]], false)

      assertConfigError(config, [], ConfigError.MissingData(["BOOL"], "Expected BOOL to exist in the provided map"))
      assertConfigError(
        config,
        [["BOOL", "value"]],
        ConfigError.InvalidData(["BOOL"], `Expected a boolean value but received "value"`)
      )
    })
  })

  describe("url", () => {
    it("name != undefined", () => {
      const config = Config.url("WEBSITE_URL")
      assertConfig(
        config,
        [["WEBSITE_URL", "https://effect.website/docs/introduction#what-is-effect"]],
        new URL("https://effect.website/docs/introduction#what-is-effect")
      )
      assertConfigError(
        config,
        [["WEBSITE_URL", "abra-kadabra"]],
        ConfigError.InvalidData(["WEBSITE_URL"], `Expected an URL value but received "abra-kadabra"`)
      )
      assertConfigError(
        config,
        [],
        ConfigError.MissingData(["WEBSITE_URL"], "Expected WEBSITE_URL to exist in the provided map")
      )
    })
  })

  describe("port", () => {
    it("name != undefined", () => {
      const config = Config.port("WEBSITE_PORT")

      assertConfig(
        config,
        [["WEBSITE_PORT", "123"]],
        123
      )
      assertConfigError(
        config,
        [["WEBSITE_PORT", "abra-kadabra"]],
        ConfigError.InvalidData(["WEBSITE_PORT"], `Expected a network port value but received "abra-kadabra"`)
      )
      assertConfigError(
        config,
        [],
        ConfigError.MissingData(["WEBSITE_PORT"], "Expected WEBSITE_PORT to exist in the provided map")
      )
    })
  })

  describe("branded", () => {
    it("name != undefined", () => {
      const config = Config.branded(Config.string("STR"), Str)

      assertConfig(
        config,
        [["STR", "123"]],
        Str("123")
      )
      assertConfigError(
        config,
        [["STR", "1"]],
        ConfigError.InvalidData(["STR"], "Brand: Expected 1 to be longer than 2")
      )
      assertConfigError(
        config,
        [],
        ConfigError.MissingData(["STR"], "Expected STR to exist in the provided map")
      )
    })
    it("name != undefined from name", () => {
      const config = Config.branded("STR", Str)

      assertConfig(
        config,
        [["STR", "123"]],
        Str("123")
      )
      assertConfigError(
        config,
        [["STR", "1"]],
        ConfigError.InvalidData(["STR"], "Brand: Expected 1 to be longer than 2")
      )
      assertConfigError(
        config,
        [],
        ConfigError.MissingData(["STR"], "Expected STR to exist in the provided map")
      )
    })
  })

  describe("nonEmptyString", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.nonEmptyString(), "ITEMS")
      assertConfig(config, [["ITEMS", "foo"]], ["foo"])
      assertConfigError(config, [["ITEMS", ""]], ConfigError.MissingData(["ITEMS"], "Expected a non-empty string"))
    })

    it("name != undefined", () => {
      const config = Config.nonEmptyString("NON_EMPTY_STRING")
      assertConfig(config, [["NON_EMPTY_STRING", "foo"]], "foo")
      assertConfig(config, [["NON_EMPTY_STRING", " "]], " ")
      assertConfigError(
        config,
        [["NON_EMPTY_STRING", ""]],
        ConfigError.MissingData(["NON_EMPTY_STRING"], "Expected a non-empty string")
      )
    })
  })

  describe("number", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.number(), "ITEMS")
      assertConfig(config, [["ITEMS", "1"]], [1])
      assertConfigError(
        config,
        [["ITEMS", "123qq"]],
        ConfigError.InvalidData(["ITEMS"], `Expected a number value but received "123qq"`)
      )
      assertConfigError(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], `Expected a number value but received "value"`)
      )
    })

    it("name != undefined", () => {
      const config = Config.number("NUMBER")
      assertConfig(config, [["NUMBER", "1"]], 1)
      assertConfig(config, [["NUMBER", "1.2"]], 1.2)
      assertConfig(config, [["NUMBER", "-1"]], -1)
      assertConfig(config, [["NUMBER", "-1.2"]], -1.2)
      assertConfig(config, [["NUMBER", "0"]], 0)
      assertConfig(config, [["NUMBER", "-0"]], -0)

      assertConfigError(config, [], ConfigError.MissingData(["NUMBER"], "Expected NUMBER to exist in the provided map"))
      assertConfigError(
        config,
        [["NUMBER", "value"]],
        ConfigError.InvalidData(["NUMBER"], `Expected a number value but received "value"`)
      )
    })
  })

  describe("literal", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.literal("a", "b")(), "ITEMS")
      assertConfig(config, [["ITEMS", "a"]], ["a"])
      assertConfigError(
        config,
        [["ITEMS", "value"]],
        ConfigError.InvalidData(["ITEMS"], `Expected one of (a, b) but received "value"`)
      )
    })

    it("name != undefined", () => {
      const config = Config.literal("a", 0, -0.3, BigInt(5), false, null)("LITERAL")
      assertConfig(config, [["LITERAL", "a"]], "a")
      assertConfig(config, [["LITERAL", "0"]], 0)
      assertConfig(config, [["LITERAL", "-0.3"]], -0.3)
      assertConfig(config, [["LITERAL", "5"]], BigInt(5))
      assertConfig(config, [["LITERAL", "false"]], false)
      assertConfig(config, [["LITERAL", "null"]], null)

      assertConfigError(
        config,
        [],
        ConfigError.MissingData(["LITERAL"], "Expected LITERAL to exist in the provided map")
      )
      assertConfigError(
        config,
        [["LITERAL", "value"]],
        ConfigError.InvalidData(["LITERAL"], `Expected one of (a, 0, -0.3, 5, false, null) but received "value"`)
      )
    })
  })

  describe("date", () => {
    it("name = undefined", () => {
      const config = Config.date()
      assertConfig(config, [["", "0"]], new Date(Date.parse("0")))
      assertConfigError(
        config,
        [["", "value"]],
        ConfigError.InvalidData([], `Expected a Date value but received "value"`)
      )
    })

    it("name != undefined", () => {
      const config = Config.date("DATE")
      assertConfig(config, [["DATE", "0"]], new Date(Date.parse("0")))

      assertConfigError(config, [], ConfigError.MissingData(["DATE"], "Expected DATE to exist in the provided map"))
      assertConfigError(
        config,
        [["DATE", "value"]],
        ConfigError.InvalidData(["DATE"], `Expected a Date value but received "value"`)
      )
    })
  })

  it("fail", () => {
    const config = Config.fail("failure message")
    assertConfigError(config, [], ConfigError.MissingData([], "failure message"))
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
    assertConfig(config, [["STRING", "1"]], 1)
    assertConfigError(
      config,
      [["STRING", "value"]],
      ConfigError.InvalidData(["STRING"], "invalid number")
    )
    assertConfigError(
      config,
      [["STRING", "-1"]],
      ConfigError.InvalidData(["STRING"], "invalid negative number")
    )
    assertConfigError(config, [], ConfigError.MissingData(["STRING"], "Expected STRING to exist in the provided map"))
  })

  describe("logLevel", () => {
    it("name = undefined", () => {
      const config = Config.logLevel()
      assertConfig(config, [["", "DEBUG"]], LogLevel.Debug)

      assertConfigError(config, [["", "-"]], ConfigError.InvalidData([], `Expected a log level but received "-"`))
    })

    it("name != undefined", () => {
      const config = Config.logLevel("LOG_LEVEL")
      assertConfig(config, [["LOG_LEVEL", "DEBUG"]], LogLevel.Debug)

      assertConfigError(
        config,
        [["LOG_LEVEL", "-"]],
        ConfigError.InvalidData(["LOG_LEVEL"], `Expected a log level but received "-"`)
      )
    })
  })

  describe("duration", () => {
    it("name = undefined", () => {
      const config = Config.duration()
      assertConfig(config, [["", "10 seconds"]], Duration.decode("10 seconds"))

      assertConfigError(config, [["", "-"]], ConfigError.InvalidData([], `Expected a duration but received "-"`))
    })

    it("name != undefined", () => {
      const config = Config.duration("DURATION")
      assertConfig(config, [["DURATION", "10 seconds"]], Duration.decode("10 seconds"))

      assertConfigError(
        config,
        [["DURATION", "-"]],
        ConfigError.InvalidData(["DURATION"], `Expected a duration but received "-"`)
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
      assertConfig(flat, [["NUMBER", "1"]], 1)
      assertConfig(flat, [["NUMBER", "1.2"]], 1.2)
      assertConfigError(
        flat,
        [["NUMBER", "-1"]],
        ConfigError.InvalidData(["NUMBER"], "a positive number")
      )

      const nested = flat.pipe(
        Config.nested("NESTED1")
      )
      assertConfig(nested, [["NESTED1.NUMBER", "1"]], 1)
      assertConfig(nested, [["NESTED1.NUMBER", "1.2"]], 1.2)
      assertConfigError(
        nested,
        [["NESTED1.NUMBER", "-1"]],
        ConfigError.InvalidData(["NESTED1", "NUMBER"], "a positive number")
      )

      const doubleNested = nested.pipe(Config.nested("NESTED2"))
      assertConfig(doubleNested, [["NESTED2.NESTED1.NUMBER", "1"]], 1)
      assertConfig(doubleNested, [["NESTED2.NESTED1.NUMBER", "1.2"]], 1.2)
      assertConfigError(
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
      assertConfig(config, [["key", "1"]], 1)
      // missing data
      assertConfig(config, [], 0)
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key"),
        Config.withDefault(0)
      )
      assertConfig(config, [["key", "1"]], 1)
      assertConfigError(
        config,
        [["key", "1.2"]],
        // available data but not an integer
        ConfigError.InvalidData(["key"], `Expected an integer value but received "1.2"`)
      )
      assertConfigError(
        config,
        [["key", "value"]],
        // available data but not an integer
        ConfigError.InvalidData(["key"], `Expected an integer value but received "value"`)
      )
    })

    it("does not recover from missing data and other error", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.zip(Config.integer("key2")),
        Config.withDefault([0, 0])
      )
      assertConfig(config, [], [0, 0])
      assertConfig(config, [["key1", "1"], ["key2", "2"]], [1, 2])
      assertConfigError(
        config,
        [["key2", "value"]],
        ConfigError.And(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], `Expected an integer value but received "value"`)
        )
      )
    })

    it("does not recover from missing data or other error", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.orElse(() => Config.integer("key2")),
        Config.withDefault(0)
      )
      assertConfig(config, [], 0)
      assertConfig(config, [["key1", "1"]], 1)
      assertConfig(config, [["key2", "2"]], 2)
      assertConfigError(
        config,
        [["key2", "value"]],
        ConfigError.Or(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], `Expected an integer value but received "value"`)
        )
      )
    })
  })

  describe("option", () => {
    it("recovers from missing data error", () => {
      const config = Config.option(Config.integer("key"))
      assertConfig(config, [], Option.none())
      assertConfig(config, [["key", "1"]], Option.some(1))
    })

    it("does not recover from other errors", () => {
      const config = Config.option(Config.integer("key"))
      assertConfigError(
        config,
        [["key", "value"]],
        ConfigError.InvalidData(["key"], `Expected an integer value but received "value"`)
      )
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.zip(Config.integer("key2")),
        Config.option
      )
      assertConfig(config, [["key1", "1"], ["key2", "2"]], Option.some([1, 2]))
      assertConfigError(
        config,
        [["key1", "value"]],
        ConfigError.And(
          ConfigError.InvalidData(["key1"], `Expected an integer value but received "value"`),
          ConfigError.MissingData(["key2"], "Expected key2 to exist in the provided map")
        )
      )
      assertConfigError(
        config,
        [["key2", "value"]],
        ConfigError.And(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], `Expected an integer value but received "value"`)
        )
      )
    })

    it("does not recover from other errors", () => {
      const config = pipe(
        Config.integer("key1"),
        Config.orElse(() => Config.integer("key2")),
        Config.option
      )
      assertConfig(config, [["key1", "1"]], Option.some(1))
      assertConfig(config, [["key1", "value"], ["key2", "2"]], Option.some(2))
      assertConfigError(
        config,
        [["key2", "value"]],
        ConfigError.Or(
          ConfigError.MissingData(["key1"], "Expected key1 to exist in the provided map"),
          ConfigError.InvalidData(["key2"], `Expected an integer value but received "value"`)
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
      assertConfig(config, [["key1", "123"], ["items", "1,2,3"], ["option", "123"], ["secret", "sauce"], [
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
      assertConfigError(
        config,
        [["key1", "123"], ["items", "1,value,3"], ["option", "123"], ["secret", "sauce"], ["key2", "value"]],
        ConfigError.InvalidData(["items"], `Expected an integer value but received "value"`)
      )
    })
  })

  it("sync", () => {
    const config = Config.sync(() => 1)
    assertConfig(config, [], 1)
  })

  describe("all", () => {
    describe("tuple", () => {
      it("length = 0", () => {
        const config = Config.all([])
        assertConfig(config, [], [])
      })

      it("length = 1", () => {
        const config = Config.all([Config.number("NUMBER")])
        assertConfig(config, [["NUMBER", "1"]], [1])
      })

      it("length > 1", () => {
        const config = Config.all([Config.number("NUMBER"), Config.boolean("BOOL")])
        assertConfig(config, [["NUMBER", "1"], ["BOOL", "true"]], [1, true])
        assertConfigError(
          config,
          [["NUMBER", "value"], ["BOOL", "true"]],
          ConfigError.InvalidData(["NUMBER"], `Expected a number value but received "value"`)
        )
        assertConfigError(
          config,
          [["NUMBER", "1"], ["BOOL", "value"]],
          ConfigError.InvalidData(["BOOL"], `Expected a boolean value but received "value"`)
        )
      })
    })

    it("iterable", () => {
      const set = new Set([Config.number("NUMBER"), Config.boolean("BOOL")])
      const config = Config.all(set)
      assertConfig(config, [["NUMBER", "1"], ["BOOL", "true"]], [1, true])
      assertConfigError(
        config,
        [["NUMBER", "value"], ["BOOL", "true"]],
        ConfigError.InvalidData(["NUMBER"], `Expected a number value but received "value"`)
      )
      assertConfigError(
        config,
        [["NUMBER", "1"], ["BOOL", "value"]],
        ConfigError.InvalidData(["BOOL"], `Expected a boolean value but received "value"`)
      )
    })
  })

  describe("Config.redacted", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.redacted(), "ITEMS")
      assertConfig(config, [["ITEMS", "a"]], [Redacted.make("a")])
    })

    it("name != undefined", () => {
      const config = Config.redacted("SECRET")
      assertConfig(config, [["SECRET", "a"]], Redacted.make("a"))
    })

    it("can wrap generic Config", () => {
      const config = Config.redacted(Config.integer("NUM"))
      assertConfig(config, [["NUM", "2"]], Redacted.make(2))
    })
  })

  describe("Secret", () => {
    describe("Config.secret", () => {
      it("name = undefined", () => {
        const config = Config.array(Config.secret(), "ITEMS")
        assertConfig(config, [["ITEMS", "a"]], [Secret.fromString("a")])
      })

      it("name != undefined", () => {
        const config = Config.secret("SECRET")
        assertConfig(config, [["SECRET", "a"]], Secret.fromString("a"))
      })
    })

    it("chunk constructor", () => {
      const secret = Secret.fromIterable(Chunk.fromIterable("secret".split("")))
      assertTrue(Equal.equals(secret, Secret.fromString("secret")))
    })

    it("value", () => {
      const secret = Secret.fromIterable(Chunk.fromIterable("secret".split("")))
      const value = Secret.value(secret)
      strictEqual(value, "secret")
    })

    it("toString", () => {
      const secret = Secret.fromString("secret")
      strictEqual(`${secret}`, "Secret(<redacted>)")
    })

    it("toJSON", () => {
      const secret = Secret.fromString("secret")
      strictEqual(JSON.stringify(secret), "\"<redacted>\"")
    })

    it("wipe", () => {
      const secret = Secret.fromString("secret")
      Secret.unsafeWipe(secret)
      assertTrue(
        Equal.equals(
          Secret.value(secret),
          Array.from({ length: "secret".length }, () => String.fromCharCode(0)).join("")
        )
      )
    })
  })

  it("withDescription", () => {
    const config = Config.number("NUMBER").pipe(Config.withDescription("my description"))
    assertTrue("description" in config)
  })

  describe("hashSet", () => {
    it("name = undefined", () => {
      const config = Config.array(Config.hashSet(Config.string()), "ITEMS")
      assertConfig(config, [["ITEMS", "a,b,c"]], [HashSet.make("a", "b", "c")])
    })

    it("name != undefined", () => {
      const config = Config.hashSet(Config.string(), "HASH_SET")
      assertConfig(config, [["HASH_SET", "a,b,c"]], HashSet.make("a", "b", "c"))
    })
  })

  it("can be yielded", () => {
    const result = Effect.runSync(Effect.withConfigProvider(
      Config.string("STRING"),
      ConfigProvider.fromMap(new Map([["STRING", "value"]]))
    ))
    strictEqual(result, "value")
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
    deepStrictEqual(result, [1, 2, 3])
  })

  it("ConfigError message", () => {
    const missingData = ConfigError.MissingData(["PATH"], "missing PATH")
    const invalidData = ConfigError.InvalidData(["PATH1"], "invalid PATH1")
    const andError = ConfigError.And(missingData, invalidData)
    const orError = ConfigError.Or(missingData, invalidData)

    strictEqual(
      andError.message,
      "(Missing data at PATH: \"missing PATH\") and (Invalid data at PATH1: \"invalid PATH1\")"
    )
    strictEqual(
      orError.message,
      "(Missing data at PATH: \"missing PATH\") or (Invalid data at PATH1: \"invalid PATH1\")"
    )
  })
})
