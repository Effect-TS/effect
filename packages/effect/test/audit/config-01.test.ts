import { assert, describe, it } from "@effect/vitest"
import { Cause, Config, ConfigProvider, Effect, Exit } from "effect"

describe("Config", () => {
  // packages/effect/src/Config.ts:620 (Effect.orDie in loadCursor) and :839 (catchDefect rebuilding a
  // single Fail(ConfigError)). ConfigError only wraps the SourceError; independent finalizer defects must
  // be retained, as in Effect.test.ts "onExit preserves the original failure when the finalizer throws".
  it.effect("keeps a provider finalizer defect alongside the wrapped SourceError", () =>
    Effect.gen(function*() {
      const cleanup = new Error("cleanup failed")
      const provider = ConfigProvider.make(() =>
        Effect.fail(new ConfigProvider.SourceError({ message: "read failed" })).pipe(
          Effect.ensuring(Effect.die(cleanup))
        )
      )
      const exit = yield* Effect.exit(Config.String("A").parse(provider))

      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.deepStrictEqual(exit.cause.reasons.filter(Cause.isDieReason).map((r) => r.defect), [cleanup])
      }
    }))
})
