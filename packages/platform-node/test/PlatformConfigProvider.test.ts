import { FileSystem, Path, PlatformConfigProvider } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Config, Effect, Either } from "effect"

describe("dotenv", () => {
  const ExampleConfig = Config.all({
    value: Config.string("VALUE"),
    number: Config.number("NUMBER")
  })

  it.scopedLive.each([
    {
      name: "Simple variables",
      config: ExampleConfig,
      content: "VALUE=hello\nNUMBER=69",
      expected: { value: "hello", number: 69 }
    },
    {
      name: "Whitespaces",
      config: ExampleConfig,
      content: "VALUE= hello  \n NUMBER= 69 \n\n",
      expected: { value: "hello", number: 69 }
    },
    {
      name: "Quotes",
      config: Config.all({
        value: Config.string("VALUE"),
        anotherValue: Config.string("ANOTHER_VALUE")
      }),
      content: "VALUE=\" hello  \"\nANOTHER_VALUE=' another   '",
      expected: { value: " hello  ", anotherValue: " another   " }
    },
    {
      name: "Expand",
      config: ExampleConfig,
      content: "VALUE=hello-${NUMBER}\nNUMBER=69",
      expected: { value: "hello-69", number: 69 }
    }
  ])("parsing ($name)", ({ config, content, expected }) =>
    Effect.gen(function*() {
      const envFile = yield* createTmpEnvFile(content)
      const result = yield* (config as Config.Config<unknown>).pipe(
        Effect.provide(PlatformConfigProvider.layerDotEnv(envFile))
      )
      expect(result).toEqual(expected)
    }).pipe(Effect.provide(NodeContext.layer)))

  it.scopedLive("load from both process env and dotenv file", () =>
    Effect.gen(function*() {
      yield* modifyEnv("VALUE", "hello")
      const envFile = yield* createTmpEnvFile("NUMBER=69")
      const result = yield* ExampleConfig.pipe(
        Effect.provide(PlatformConfigProvider.layerDotEnvAdd(envFile))
      )
      expect(result).toEqual({ value: "hello", number: 69 })
    }).pipe(Effect.provide(NodeContext.layer)))

  it.scopedLive("current ConfigProvider has precedence over dotenv", () =>
    Effect.gen(function*() {
      yield* modifyEnv("VALUE", "hello")
      const envFile = yield* createTmpEnvFile("NUMBER=69\nVALUE=another")
      const result = yield* ExampleConfig.pipe(
        Effect.provide(PlatformConfigProvider.layerDotEnvAdd(envFile))
      )
      expect(result).toEqual({ value: "hello", number: 69 })
    }).pipe(Effect.provide(NodeContext.layer)))

  it.scopedLive("fromDotEnv fails if no .env file is found", () =>
    Effect.gen(function*() {
      const result = yield* PlatformConfigProvider.fromDotEnv(".non-existing-env-file").pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
    }).pipe(Effect.provide(NodeContext.layer)))

  it.scopedLive("layerDotEnvAdd succeeds if no .env file is found", () =>
    Effect.gen(function*() {
      yield* modifyEnv("VALUE", "hello")
      const value = yield* Config.string("VALUE")
      expect(value).toEqual("hello")
    }).pipe(
      Effect.provide(PlatformConfigProvider.layerDotEnvAdd(".non-existing-env-file")),
      Effect.provide(NodeContext.layer)
    ))
})

// utils

const createTmpEnvFile = (data: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const dir = yield* fs.makeTempDirectoryScoped({ prefix: "tmp" })
    const filename = path.join(dir, ".env")
    yield* fs.writeFileString(filename, data)
    return filename
  })

const modifyEnv = (key: string, value: string) =>
  Effect.gen(function*() {
    const isInEnv = key in process.env
    const original = process.env[key]
    process.env[key] = value

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (isInEnv) {
          process.env[key] = original
        } else {
          delete process.env[key]
        }
      })
    )
  })
