import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import { PlatformDirectories } from "effect/unstable/cli"

const resolve = (input: {
  readonly appName?: string
  readonly platform: string
  readonly home?: string | undefined
  readonly xdgConfigHome?: string | undefined
  readonly appData?: string | undefined
}): string | undefined =>
  PlatformDirectories.resolveConfigDirectory({
    appName: input.appName ?? "myapp",
    platform: input.platform,
    home: input.home,
    xdgConfigHome: input.xdgConfigHome,
    appData: input.appData
  })

const provideEnv = (platform: string, env: Record<string, string>) => <A, E, R>(self: Effect.Effect<A, E, R>) =>
  self.pipe(
    Effect.provide(PlatformDirectories.layer({ appName: "myapp", platform })),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))
  )

describe("PlatformDirectories", () => {
  it("uses an absolute XDG_CONFIG_HOME on every platform", () => {
    assert.strictEqual(
      resolve({ platform: "linux", home: "/home/ada", xdgConfigHome: "/custom/config" }),
      "/custom/config/myapp"
    )
    assert.strictEqual(
      resolve({
        platform: "darwin",
        home: "/Users/ada",
        xdgConfigHome: "/custom/config"
      }),
      "/custom/config/myapp"
    )
    assert.strictEqual(
      resolve({
        platform: "win32",
        home: "C:\\Users\\ada",
        xdgConfigHome: "D:/configs",
        appData: "C:\\Users\\ada\\AppData\\Roaming"
      }),
      "D:\\configs\\myapp"
    )
  })

  it("ignores a relative XDG_CONFIG_HOME", () => {
    assert.strictEqual(
      resolve({ platform: "linux", home: "/home/ada", xdgConfigHome: "relative/config" }),
      "/home/ada/.config/myapp"
    )
    assert.strictEqual(
      resolve({ platform: "darwin", home: "/Users/ada", xdgConfigHome: "relative/config" }),
      "/Users/ada/Library/Application Support/myapp"
    )
    assert.strictEqual(
      resolve({
        platform: "win32",
        home: "C:\\Users\\ada",
        xdgConfigHome: "relative/config",
        appData: undefined
      }),
      "C:\\Users\\ada\\AppData\\Roaming\\myapp"
    )
  })

  it("falls back to ~/AppData/Roaming when APPDATA is missing or relative", () => {
    assert.strictEqual(
      resolve({ platform: "win32", home: "C:\\Users\\ada" }),
      "C:\\Users\\ada\\AppData\\Roaming\\myapp"
    )
    assert.strictEqual(
      resolve({ platform: "win32", home: "C:\\Users\\ada", appData: "AppData\\Roaming" }),
      "C:\\Users\\ada\\AppData\\Roaming\\myapp"
    )
  })

  it("uses an absolute APPDATA on Windows", () => {
    assert.strictEqual(
      resolve({ platform: "win32", home: "C:\\Users\\ada", appData: "D:\\Data" }),
      "D:\\Data\\myapp"
    )
  })

  it("uses the host default when XDG is unset", () => {
    assert.strictEqual(resolve({ platform: "linux", home: "/home/ada" }), "/home/ada/.config/myapp")
    assert.strictEqual(
      resolve({ platform: "darwin", home: "/Users/ada" }),
      "/Users/ada/Library/Application Support/myapp"
    )
    assert.strictEqual(resolve({ platform: "freebsd", home: "/home/ada" }), "/home/ada/.config/myapp")
  })

  it("reports a missing home when the fallback needs one", () => {
    assert.strictEqual(resolve({ platform: "linux" }), undefined)
    assert.strictEqual(resolve({ platform: "win32", appData: "relative" }), undefined)
    assert.strictEqual(
      resolve({ platform: "linux", xdgConfigHome: "/custom/config" }),
      "/custom/config/myapp"
    )
  })

  it.effect("reads environment variables through ConfigProvider", () =>
    Effect.gen(function*() {
      const dirs = yield* PlatformDirectories.PlatformDirectories
      assert.strictEqual(dirs.config, "C:\\Users\\ada\\AppData\\Roaming\\myapp")
    }).pipe(provideEnv("win32", {
      XDG_CONFIG_HOME: "",
      APPDATA: "relative",
      USERPROFILE: "C:\\Users\\ada",
      HOME: "/home/ada"
    })))

  it.effect("fails when no home directory is available", () =>
    Effect.gen(function*() {
      const result = yield* Effect.result(
        Effect.flatMap(PlatformDirectories.PlatformDirectories, () => Effect.void).pipe(
          provideEnv("darwin", { XDG_CONFIG_HOME: "relative" })
        )
      )
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "PlatformDirectoriesMissingHome")
      }
    }))
})
