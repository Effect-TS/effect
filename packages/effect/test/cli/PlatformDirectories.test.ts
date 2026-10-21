import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import { PlatformDirectories } from "effect/cli"

const resolve = (platform: string, env: Record<string, string>) =>
  PlatformDirectories.PlatformDirectories.pipe(
    Effect.map((dirs) => dirs.config),
    Effect.provide(PlatformDirectories.layer({ appName: "myapp", platform })),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))
  )

describe("PlatformDirectories", () => {
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

  it.effect("fails with MissingHome when no home directory is available", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(resolve("linux", {}))
      assert.instanceOf(error, PlatformDirectories.MissingHome)
    }))
})
