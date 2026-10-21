/**
 * Well-known directories for CLI application data.
 *
 * `PlatformDirectories` resolves where an application should store its
 * configuration, following the host platform conventions. The resolved
 * directory composes with `KeyValueStore.layerFileSystem`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"

/**
 * Directories resolved for one application.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Service {
  readonly config: string
}

/**
 * Service tag for an application's platform directories.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class PlatformDirectories extends Context.Service<PlatformDirectories, Service>()(
  "effect/cli/PlatformDirectories"
) {}

/**
 * Raised when the config directory depends on a home directory that is not
 * set.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class MissingHome extends Data.TaggedError("PlatformDirectoriesMissingHome")<{
  readonly appName: string
}> {
  override get message(): string {
    return `No home directory is available to resolve the config directory for ${this.appName}`
  }
}

const isAbsolute = (path: string, platform: string): boolean =>
  platform === "win32" ? /^([a-zA-Z]:)?[\\/]/.test(path) : path.startsWith("/")

const join = (platform: string, base: string, ...segments: ReadonlyArray<string>): string =>
  platform === "win32"
    ? [base.replace(/[\\/]+$/, ""), ...segments].join("\\")
    : [base.replace(/\/+$/, ""), ...segments].join("/")

const optionalString = (name: string) => Config.String(name).pipe(Config.withDefault(undefined))

/**
 * Resolves `PlatformDirectories` from the current `ConfigProvider`.
 *
 * **Details**
 *
 * An absolute `XDG_CONFIG_HOME` is used on every platform. Otherwise Windows
 * uses an absolute `APPDATA`, falling back to `%USERPROFILE%\AppData\Roaming`,
 * macOS uses `~/Library/Application Support`, and other platforms use
 * `~/.config`. The application name is appended.
 *
 * `platform` defaults to the host platform.
 *
 * **Example** (Resolving the config directory)
 *
 * ```ts import.meta.vitest
 * import { ConfigProvider, Effect } from "effect"
 * import { PlatformDirectories } from "effect/cli"
 *
 * const program = Effect.gen(function*() {
 *   const dirs = yield* PlatformDirectories.PlatformDirectories
 *   return dirs.config
 * }).pipe(
 *   Effect.provide(PlatformDirectories.layer({ appName: "myapp", platform: "linux" })),
 *   Effect.provideService(
 *     ConfigProvider.ConfigProvider,
 *     ConfigProvider.fromEnv({ env: { HOME: "/home/ada" } })
 *   )
 * )
 *
 * await Effect.runPromise(program) // => "/home/ada/.config/myapp"
 * ```
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly appName: string
  readonly platform?: string | undefined
}): Layer.Layer<PlatformDirectories, MissingHome> =>
  Layer.effect(PlatformDirectories)(Effect.gen(function*() {
    const { appName } = options
    const platform = options.platform ?? (globalThis as any).process?.platform ?? "linux"
    const env = yield* Effect.orDie(Config.all({
      xdgConfigHome: optionalString("XDG_CONFIG_HOME"),
      appData: optionalString("APPDATA"),
      home: optionalString(platform === "win32" ? "USERPROFILE" : "HOME")
    }))

    if (env.xdgConfigHome !== undefined && isAbsolute(env.xdgConfigHome, platform)) {
      return { config: join(platform, env.xdgConfigHome, appName) }
    }
    if (platform === "win32" && env.appData !== undefined && isAbsolute(env.appData, platform)) {
      return { config: join(platform, env.appData, appName) }
    }
    if (env.home === undefined) {
      return yield* new MissingHome({ appName })
    }
    switch (platform) {
      case "win32":
        return { config: join(platform, env.home, "AppData", "Roaming", appName) }
      case "darwin":
        return { config: join(platform, env.home, "Library", "Application Support", appName) }
      default:
        return { config: join(platform, env.home, ".config", appName) }
    }
  }))
