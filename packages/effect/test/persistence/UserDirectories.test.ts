import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import * as UserDirectories from "effect/persistence/UserDirectories"

const withEnv = (env: Record<string, string>) =>
  Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))

const resolve = (platform: string, env: Record<string, string>) =>
  UserDirectories.config("myapp").pipe(
    Effect.provideService(UserDirectories.UserDirectories, UserDirectories.make({ platform })),
    withEnv(env)
  )

describe("UserDirectories", () => {
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
      assert.instanceOf(error, UserDirectories.HomeNotFound)
    }))

  it.effect("reads the environment on each call", () =>
    Effect.gen(function*() {
      const dirs = UserDirectories.make({ platform: "linux" })
      assert.strictEqual(yield* dirs.config("myapp").pipe(withEnv({ HOME: "/home/ada" })), "/home/ada/.config/myapp")
      assert.strictEqual(yield* dirs.config("myapp").pipe(withEnv({ HOME: "/home/bob" })), "/home/bob/.config/myapp")
    }))

  it.effect("can be overridden with a fixed directory", () =>
    Effect.gen(function*() {
      const config = yield* UserDirectories.config("myapp").pipe(
        Effect.provideService(UserDirectories.UserDirectories, {
          config: (appName) => Effect.succeed(`/tmp/${appName}`)
        })
      )
      assert.strictEqual(config, "/tmp/myapp")
    }))
})
