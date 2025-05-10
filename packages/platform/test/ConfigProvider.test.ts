import * as FileSystem from "@effect/platform/FileSystem"
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const ConfigProviderLive = Layer.unwrapEffect(
  PlatformConfigProvider.fromDotEnv(".env").pipe(
    Effect.map(Layer.setConfigProvider)
  )
)

describe("PlatformConfigProvider", () => {
  it.effect("should properly load configuration values from an env file", () =>
    Effect.gen(function*() {
      const fileSystem = FileSystem.layerNoop({
        readFileString: () => Effect.succeed("NESTED_CONFIG=nested_config")
      })

      const result = yield* Config.string("CONFIG").pipe(
        Config.nested("NESTED"),
        Effect.provide(Layer.provide(ConfigProviderLive, fileSystem))
      )

      strictEqual(result, "nested_config")
    }))
})
