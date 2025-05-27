/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import type * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as PathPatch from "effect/ConfigProviderPathPatch"
import * as Context from "effect/Context"
import * as DefaultServices from "effect/DefaultServices"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import { isPlatformError, type PlatformError } from "./Error.js"
import * as FileSystem from "./FileSystem.js"
import * as internal from "./internal/platformConfigProvider.js"
import * as Path from "./Path.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromFileTree = (options?: {
  readonly rootDirectory?: string
}): Effect.Effect<ConfigProvider.ConfigProvider, never, Path.Path | FileSystem.FileSystem> =>
  Effect.Do.pipe(
    Effect.bind("path", () => Path.Path),
    Effect.bind("fs", () => FileSystem.FileSystem),
    Effect.map(({ fs, path }) => {
      const rootDirectory = options?.rootDirectory ?? "/"

      const parseConfig = <A>(primitive: Config.Config.Primitive<A>) => (value: string) =>
        Either.map(primitive.parse(value.trim()), Arr.of)

      const readConfig = <A>(filePath: string, primitive: Config.Config.Primitive<A>) =>
        Effect.flatMap(
          fs.readFileString(filePath),
          parseConfig(primitive)
        )

      const resolveEnumerableDirs = (segments: ReadonlyArray<string>) =>
        segments.length === 0 ? [] : [path.join(...segments)]

      const resolveFilePath = (pathSegments: ReadonlyArray<string>) => path.join(rootDirectory, ...pathSegments)

      const sourceError = (pathSegments: ReadonlyArray<string>, error: PlatformError) =>
        ConfigError.SourceUnavailable(
          [...pathSegments],
          error.description ?? error.message,
          Cause.fail(error)
        )
      const pathNotFoundError = (pathSegments: ReadonlyArray<string>) =>
        ConfigError.MissingData(
          [...pathSegments],
          `Path ${resolveFilePath(pathSegments)} not found`
        )
      const handlePlatformError = (pathSegments: ReadonlyArray<string>) => (error: PlatformError) =>
        error._tag === "SystemError" && error.reason === "NotFound"
          ? Effect.fail(pathNotFoundError(pathSegments))
          : Effect.fail(sourceError(pathSegments, error))

      return ConfigProvider.fromFlat(
        ConfigProvider.makeFlat({
          load: (pathSegments, config) =>
            Effect.catchIf(
              readConfig(resolveFilePath(pathSegments), config),
              isPlatformError,
              handlePlatformError(pathSegments)
            ),
          enumerateChildren: (pathSegments) =>
            Effect.forEach(resolveEnumerableDirs(pathSegments), (dir) => fs.readDirectory(dir)).pipe(
              Effect.map((files) => HashSet.fromIterable(files.flat())),
              Effect.catchIf(isPlatformError, handlePlatformError(pathSegments))
            ),
          patch: PathPatch.empty
        })
      )
    })
  )

/**
 * Add the file tree ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFileTreeAdd = (options?: {
  readonly rootDirectory?: string
}): Layer.Layer<never, never, Path.Path | FileSystem.FileSystem> =>
  fromFileTree(options).pipe(
    Effect.map((provider) =>
      Layer.fiberRefLocallyScopedWith(DefaultServices.currentServices, (services) => {
        const current = Context.get(services, ConfigProvider.ConfigProvider)
        return Context.add(services, ConfigProvider.ConfigProvider, ConfigProvider.orElse(current, () => provider))
      })
    ),
    Layer.unwrapEffect
  )

/**
 * Add the file tree ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFileTree = (options?: {
  readonly rootDirectory?: string
}): Layer.Layer<never, never, Path.Path | FileSystem.FileSystem> =>
  fromFileTree(options).pipe(
    Effect.map(Layer.setConfigProvider),
    Layer.unwrapEffect
  )

/**
 * Create a dotenv ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const fromDotEnv: (
  paths: string
) => Effect.Effect<ConfigProvider.ConfigProvider, PlatformError, FileSystem.FileSystem> = internal.fromDotEnv

/**
 * Add the dotenv ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 * If the file is not found, a debug log is produced and empty layer is returned.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerDotEnvAdd: (path: string) => Layer.Layer<never, never, FileSystem.FileSystem> =
  internal.layerDotEnvAdd

/**
 * Add the dotenv ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerDotEnv: (path: string) => Layer.Layer<never, PlatformError, FileSystem.FileSystem> =
  internal.layerDotEnv
