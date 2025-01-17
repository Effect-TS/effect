import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Cause from "effect/Cause"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as DefaultServices from "effect/DefaultServices"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as ConfigFile from "../ConfigFile.js"
import * as InternalFiles from "./files.js"

const fileExtensions: Record<ConfigFile.Kind, ReadonlyArray<string>> = {
  json: ["json"],
  yaml: ["yaml", "yml"],
  ini: ["ini"],
  toml: ["toml", "tml"]
}

const allFileExtensions = Object.values(fileExtensions).flat()

/** @internal */
export const makeProvider = (fileName: string, options?: {
  readonly formats?: ReadonlyArray<ConfigFile.Kind>
  readonly searchPaths?: ReadonlyArray<string>
}): Effect.Effect<ConfigProvider.ConfigProvider, ConfigFile.ConfigFileError, Path.Path | FileSystem.FileSystem> =>
  Effect.gen(function*() {
    const path = yield* Path.Path
    const fs = yield* FileSystem.FileSystem
    const searchPaths = options?.searchPaths && options.searchPaths.length ? options.searchPaths : ["."]
    const extensions = options?.formats && options.formats.length
      ? options.formats.flatMap((_) => fileExtensions[_])
      : allFileExtensions
    const filePaths = yield* Effect.filter(
      searchPaths.flatMap(
        (searchPath) => extensions.map((ext) => path.join(searchPath, `${fileName}.${ext}`))
      ),
      (path) => Effect.orElseSucceed(fs.exists(path), () => false)
    )
    const providers = yield* Effect.forEach(filePaths, (path) =>
      pipe(
        fs.readFileString(path),
        Effect.mapError((_) => ConfigFileError(`Could not read file (${path})`)),
        Effect.flatMap((content) =>
          Effect.mapError(
            InternalFiles.parse(path, content),
            (message) => ConfigFileError(message)
          )
        ),
        Effect.map((data) => ConfigProvider.fromJson(data))
      ))

    if (providers.length === 0) {
      return ConfigProvider.fromMap(new Map())
    }

    return providers.reduce((acc, provider) => ConfigProvider.orElse(acc, () => provider))
  })

/** @internal */
export const layer = (fileName: string, options?: {
  readonly formats?: ReadonlyArray<ConfigFile.Kind>
  readonly searchPaths?: ReadonlyArray<string>
}): Layer.Layer<never, ConfigFile.ConfigFileError, Path.Path | FileSystem.FileSystem> =>
  pipe(
    makeProvider(fileName, options),
    Effect.map((provider) =>
      Layer.fiberRefLocallyScopedWith(DefaultServices.currentServices, (services) => {
        const current = Context.get(services, ConfigProvider.ConfigProvider)
        return Context.add(services, ConfigProvider.ConfigProvider, ConfigProvider.orElse(current, () => provider))
      })
    ),
    Layer.unwrapEffect
  )

/** @internal */
export const ConfigErrorTypeId: ConfigFile.ConfigErrorTypeId = Symbol.for(
  "@effect/cli/ConfigFile/ConfigFileError"
) as ConfigFile.ConfigErrorTypeId

const ConfigFileErrorProto = Object.assign(Object.create(Cause.YieldableError.prototype), {
  [ConfigErrorTypeId]: ConfigErrorTypeId
})

/** @internal */
export const ConfigFileError = (message: string): ConfigFile.ConfigFileError => {
  const self = Object.create(ConfigFileErrorProto)
  self._tag = "ConfigFileError"
  self.message = message
  return self
}
