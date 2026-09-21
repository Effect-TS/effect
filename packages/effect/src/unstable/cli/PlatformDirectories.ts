/**
 * Well-known directories for CLI application data.
 *
 * `PlatformDirectories` resolves where an application should persist config.
 * The first version only fills `config`, as a field on the service, so cache
 * and state can be added later without changing the shape callers already
 * read. `XDG_CONFIG_HOME` wins on every platform when it is an absolute path.
 * Otherwise the host convention is used. A test can provide the service
 * directly, or exercise the layer with an injected `ConfigProvider` and an
 * explicit platform.
 *
 * The directory composes with `KeyValueStore.layerFileSystem`.
 *
 * @since 4.0.0
 */
import * as Config from "../../Config.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"

/**
 * Directories resolved for one application.
 *
 * **Details**
 *
 * `config` is the directory for configuration files. Cache and state are not
 * resolved yet. They belong on this same service, next to `config`.
 *
 * @category models
 * @since 4.0.0
 */
export interface Service {
  readonly config: string
}

/**
 * Service tag for an application's platform directories.
 *
 * **When to use**
 *
 * Install {@link layer} at the edge of a CLI, then pass `config` to
 * `KeyValueStore.layerFileSystem`. Tests can `Layer.succeed` a fixed directory
 * instead.
 *
 * @category services
 * @since 4.0.0
 */
export class PlatformDirectories extends Context.Service<PlatformDirectories, Service>()(
  "effect/unstable/cli/PlatformDirectories"
) {}

/**
 * Raised when a config directory needs a home directory and neither `HOME`
 * nor `USERPROFILE` is set.
 *
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

// Path is one implementation for the host. This resolver has to apply win32
// rules on a POSIX machine and POSIX rules on Windows, because every platform
// branch is tested from one host. The effect package does not ship a second
// Path, so absolute checks and joins stay local.
const isWindowsAbsolute = (path: string): boolean => /^[a-zA-Z]:[\\/]/.test(path) || /^[\\/]/.test(path)

const isPosixAbsolute = (path: string): boolean => path.startsWith("/")

const isAbsolute = (path: string, platform: string): boolean =>
  platform === "win32" ? isWindowsAbsolute(path) : isPosixAbsolute(path)

const join = (platform: string, ...parts: ReadonlyArray<string>): string => {
  const sep = platform === "win32" ? "\\" : "/"
  const normalize = (path: string): string => platform === "win32" ? path.replace(/[\\/]/g, sep) : path
  let result = ""
  for (const part of parts) {
    if (part.length === 0) {
      continue
    }
    const normalized = normalize(part)
    if (result.length === 0) {
      result = normalized
      continue
    }
    const root = result.replace(/[\\/]+$/, "")
    const next = normalized.replace(/^[\\/]+/, "")
    result = root.length === 0 ? `${sep}${next}` : `${root}${sep}${next}`
  }
  return result
}

/**
 * Resolves an application's config directory from platform and environment
 * values that have already been loaded.
 *
 * **Details**
 *
 * `XDG_CONFIG_HOME` is used on every platform when it is absolute, and a
 * relative value is ignored. Windows then uses an absolute `APPDATA`, and
 * otherwise `~/AppData/Roaming`. macOS uses `~/Library/Application Support`.
 * Every other platform uses `~/.config`. The application name is appended.
 * Returns `undefined` when that fallback needs a home directory and none was
 * provided.
 *
 * **Example** (XDG wins over the Linux default)
 *
 * ```ts import.meta.vitest
 * import { PlatformDirectories } from "effect/unstable/cli"
 *
 * const config = PlatformDirectories.resolveConfigDirectory({
 *   appName: "myapp",
 *   platform: "linux",
 *   home: "/home/ada",
 *   xdgConfigHome: "/custom/config",
 *   appData: undefined
 * })
 *
 * config // => "/custom/config/myapp"
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const resolveConfigDirectory = (input: {
  readonly appName: string
  readonly platform: string
  readonly home: string | undefined
  readonly xdgConfigHome: string | undefined
  readonly appData: string | undefined
}): string | undefined => {
  if (input.xdgConfigHome !== undefined && isAbsolute(input.xdgConfigHome, input.platform)) {
    return join(input.platform, input.xdgConfigHome, input.appName)
  }

  if (input.platform === "win32") {
    if (input.appData !== undefined && isAbsolute(input.appData, "win32")) {
      return join("win32", input.appData, input.appName)
    }
    if (input.home === undefined) {
      return undefined
    }
    return join("win32", input.home, "AppData", "Roaming", input.appName)
  }

  if (input.home === undefined) {
    return undefined
  }

  if (input.platform === "darwin") {
    return join("darwin", input.home, "Library", "Application Support", input.appName)
  }

  return join(input.platform, input.home, ".config", input.appName)
}

const optional = (name: string) => Config.option(Config.String(name))

const hostPlatform = (): string => {
  const runtime = globalThis as { readonly process?: { readonly platform?: string } }
  return runtime.process?.platform ?? "linux"
}

/**
 * Resolves `PlatformDirectories` from the current `ConfigProvider`.
 *
 * **When to use**
 *
 * Provide this at the CLI boundary. Pass `platform` in tests so every host
 * convention can run on one machine. `home` comes from `USERPROFILE` then
 * `HOME` on Windows, and from `HOME` then `USERPROFILE` elsewhere. A missing
 * variable is `None`. A provider fault dies. {@link MissingHome} is the only
 * typed failure, and it is the one a CLI can act on.
 *
 * **Example** (An empty XDG variable stays unset)
 *
 * ```ts import.meta.vitest
 * import { ConfigProvider, Effect } from "effect"
 * import { PlatformDirectories } from "effect/unstable/cli"
 *
 * const program = Effect.gen(function*() {
 *   const dirs = yield* PlatformDirectories.PlatformDirectories
 *   return dirs.config
 * }).pipe(
 *   Effect.provide(PlatformDirectories.layer({ appName: "myapp", platform: "linux" })),
 *   Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({
 *     env: {
 *       HOME: "/home/ada",
 *       XDG_CONFIG_HOME: ""
 *     }
 *   }))
 * )
 *
 * await Effect.runPromise(program) // => "/home/ada/.config/myapp"
 * ```
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly appName: string
  readonly platform?: string | undefined
}): Layer.Layer<PlatformDirectories, MissingHome> =>
  Layer.effect(PlatformDirectories)(Effect.gen(function*() {
    const platform = options.platform ?? hostPlatform()
    const read = (name: string) => Effect.orDie(optional(name))
    const xdgConfigHome = Option.getOrUndefined(yield* read("XDG_CONFIG_HOME"))
    const appData = Option.getOrUndefined(yield* read("APPDATA"))
    const home = Option.getOrUndefined(
      platform === "win32"
        ? Option.firstSomeOf([yield* read("USERPROFILE"), yield* read("HOME")])
        : Option.firstSomeOf([yield* read("HOME"), yield* read("USERPROFILE")])
    )
    const config = resolveConfigDirectory({
      appName: options.appName,
      platform,
      home,
      xdgConfigHome,
      appData
    })
    if (config === undefined) {
      return yield* Effect.fail(new MissingHome({ appName: options.appName }))
    }
    return { config }
  }))
