import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect, Option } from "effect"
import { RunnerAddress, ShardingConfig } from "effect/unstable/cluster"

describe("ShardingConfig", () => {
  it.effect("treats the optional listen address as an atomic group", () =>
    Effect.gen(function*() {
      const defaults = yield* ShardingConfig.config.parse(ConfigProvider.fromUnknown({}))
      assert.ok(Option.isNone(defaults.runnerListenAddress))

      const withHost = yield* ShardingConfig.config.parse(
        ConfigProvider.fromUnknown({ listenHost: "0.0.0.0" })
      )
      assert.deepStrictEqual(
        Option.getOrThrow(withHost.runnerListenAddress),
        RunnerAddress.make("0.0.0.0", 34431)
      )

      const missingHost = yield* ShardingConfig.config.parse(
        ConfigProvider.fromUnknown({ listenPort: "8080" })
      ).pipe(Effect.flip)
      assert.strictEqual(
        missingHost.cause.message,
        `Expected string
  at ["listenHost"]`
      )

      const invalidPort = yield* ShardingConfig.config.parse(
        ConfigProvider.fromUnknown({ listenHost: "0.0.0.0", listenPort: "invalid" })
      ).pipe(Effect.flip)
      assert.strictEqual(
        invalidPort.cause.message,
        `Expected a string representing a finite number
  at ["listenPort"]`
      )
    }))
})
