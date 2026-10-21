import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import * as AppDirectories from "effect/persistence/AppDirectories"

const withEnv = (env: Record<string, string>) =>
  Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))

const resolve = (platform: string, env: Record<string, string>) =>
  AppDirectories.config("myapp").pipe(
    Effect.provideService(AppDirectories.AppDirectories, AppDirectories.make({ platform })),
    withEnv(env)
  )

describe("AppDirectories", () => {
  it.effect("uses an absolute XDG_CONFIG_HOME on every platform", () =>
    Effect.gen(function*() {
      assert.strictEqual(
        yield* resolve("darwin", { HOME: "/Users/ada", XDG_CONFIG_HOME: "/custom" }),
        "/custom/myapp"
      )
      assert.strictEqual(
        yield* resolve("linux", { HOME: "/home/ada", XDG_CONFIG_HOME: "/custom\\" }),
        "/custom\\/myapp"
      )
      assert.strictEqual(
        yield* resolve("win32", {
          USERPROFILE: "C:\\Users\\ada",
          APPDATA: "C:\\AppData",
          XDG_CONFIG_HOME: "D:\\custom"
        }),
        "D:\\custom\\myapp"
      )
    }))

  it.effect("falls back to the platform default", () =>
    Effect.gen(function*() {
      assert.strictEqual(
        yield* resolve("linux", { HOME: "/home/ada", XDG_CONFIG_HOME: "relative" }),
        "/home/ada/.config/myapp"
      )
      assert.strictEqual(
        yield* resolve("darwin", { HOME: "/Users/ada" }),
        "/Users/ada/Library/Application Support/myapp"
      )
      assert.strictEqual(
        yield* resolve("win32", { USERPROFILE: "C:\\Users\\ada", APPDATA: "D:\\AppData" }),
        "D:\\AppData\\myapp"
      )
      assert.strictEqual(
        yield* resolve("win32", { USERPROFILE: "C:\\Users\\ada", APPDATA: "relative" }),
        "C:\\Users\\ada\\AppData\\Roaming\\myapp"
      )
    }))

  it.effect("fails with HomeNotFound when no home directory is available", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(resolve("linux", {}))
      assert.instanceOf(error, AppDirectories.HomeNotFound)
    }))

  it.effect("reads the environment on each call", () =>
    Effect.gen(function*() {
      const dirs = AppDirectories.make({ platform: "linux" })
      assert.strictEqual(yield* dirs.config("myapp").pipe(withEnv({ HOME: "/home/ada" })), "/home/ada/.config/myapp")
      assert.strictEqual(yield* dirs.config("myapp").pipe(withEnv({ HOME: "/home/bob" })), "/home/bob/.config/myapp")
    }))

  it.effect("can be overridden with a fixed directory", () =>
    Effect.gen(function*() {
      const config = yield* AppDirectories.config("myapp").pipe(
        Effect.provideService(AppDirectories.AppDirectories, {
          config: (appName) => Effect.succeed(`/tmp/${appName}`)
        })
      )
      assert.strictEqual(config, "/tmp/myapp")
    }))
})
