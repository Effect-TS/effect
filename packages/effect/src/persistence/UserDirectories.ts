/**
 * Well-known directories for an application's persisted data.
 *
 * `UserDirectories` resolves where an application should keep its
 * configuration, following the conventions of the host platform. The
 * resolved directory is what `KeyValueStore.layerFileSystem` expects.
 *
 * **Example** (Backing a key-value store with the config directory)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { UserDirectories, KeyValueStore } from "effect/persistence"
 *
 * const StoreLive = Layer.unwrap(
 *   Effect.map(UserDirectories.config("myapp"), KeyValueStore.layerFileSystem)
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"

/**
 * Resolves directories for an application.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Service {
  /**
   * Resolves the directory where `appName` should keep its configuration.
   */
  readonly config: (appName: string) => Effect.Effect<string, HomeNotFound>
}

/**
 * Context reference for the user directory resolver. The default
 * resolves from the current `ConfigProvider` using the host platform's
 * conventions.
 *
 * **When to use**
 *
 * Use to replace the resolver in tests with one that returns a fixed
 * directory.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class UserDirectories extends Context.Reference<Service>("effect/persistence/UserDirectories", {
  defaultValue: () => make()
}) {}

/**
 * Raised when the config directory depends on a home directory that is not
 * set.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class HomeNotFound extends Data.TaggedError("UserDirectoriesHomeNotFound")<{
  readonly appName: string
}> {
  override get message(): string {
    return `No home directory is available to resolve the config directory for ${this.appName}`
  }
}

const optionalString = (name: string) => Config.String(name).pipe(Config.withDefault(undefined))

const configBase = (platform: string, env: {
  readonly xdgConfigHome: string | undefined
  readonly appData: string | undefined
  readonly home: string | undefined
}): string | undefined => {
  if (env.xdgConfigHome !== undefined && isAbsolute(platform, env.xdgConfigHome)) {
    return env.xdgConfigHome
  }
  if (platform === "win32" && env.appData !== undefined && isAbsolute(platform, env.appData)) {
    return env.appData
  }
  if (env.home === undefined) {
    return undefined
  }
  switch (platform) {
    case "win32":
      return join(platform, env.home, "AppData", "Roaming")
    case "darwin":
      return join(platform, env.home, "Library", "Application Support")
    default:
      return join(platform, env.home, ".config")
  }
}

const isAbsolute = (platform: string, path: string): boolean =>
  platform === "win32" ? /^([a-zA-Z]:)?[\\/]/.test(path) : path.startsWith("/")

const join = (platform: string, base: string, ...segments: ReadonlyArray<string>): string =>
  platform === "win32"
    ? [base.replace(/[\\/]+$/, ""), ...segments].join("\\")
    : [base.replace(/\/+$/, ""), ...segments].join("/")

/**
 * Creates a resolver that reads the environment from the current
 * `ConfigProvider` on every call.
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
 * **Example** (Resolving for another platform)
 *
 * ```ts import.meta.vitest
 * import { ConfigProvider, Effect } from "effect"
 * import { UserDirectories } from "effect/persistence"
 *
 * const program = UserDirectories.config("myapp").pipe(
 *   Effect.provideService(UserDirectories.UserDirectories, UserDirectories.make({ platform: "darwin" })),
 *   Effect.provideService(
 *     ConfigProvider.ConfigProvider,
 *     ConfigProvider.fromEnv({ env: { HOME: "/Users/ada" } })
 *   )
 * )
 *
 * await Effect.runPromise(program) // => "/Users/ada/Library/Application Support/myapp"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: {
  readonly platform?: string | undefined
}): Service => {
  const platform = options?.platform ?? (globalThis as any).process?.platform ?? "linux"
  const environment = Config.all({
    xdgConfigHome: optionalString("XDG_CONFIG_HOME"),
    appData: optionalString("APPDATA"),
    home: optionalString(platform === "win32" ? "USERPROFILE" : "HOME")
  })
  return {
    config: (appName) =>
      Effect.flatMap(Effect.orDie(environment), (env) => {
        const base = configBase(platform, env)
        return base === undefined
          ? Effect.fail(new HomeNotFound({ appName }))
          : Effect.succeed(join(platform, base, appName))
      })
  }
}

/**
 * Resolves the directory where `appName` should keep its configuration, using
 * the current `UserDirectories` reference.
 *
 * **Example** (Resolving the config directory)
 *
 * ```ts import.meta.vitest
 * import { ConfigProvider, Effect } from "effect"
 * import { UserDirectories } from "effect/persistence"
 *
 * const program = UserDirectories.config("myapp").pipe(
 *   Effect.provideService(UserDirectories.UserDirectories, UserDirectories.make({ platform: "linux" })),
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
 * @category accessors
 * @since 4.0.0
 */
export const config = (appName: string): Effect.Effect<string, HomeNotFound> =>
  UserDirectories.use((dirs) => dirs.config(appName))
