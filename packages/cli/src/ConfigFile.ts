/**
 * @since 2.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { YieldableError } from "effect/Cause"
import type { ConfigProvider } from "effect/ConfigProvider"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import * as Internal from "./internal/configFile.js"

/**
 * @since 2.0.0
 * @category models
 */
export type Kind = "json" | "yaml" | "ini" | "toml"

/**
 * @since 2.0.0
 * @category errors
 */
export const ConfigErrorTypeId: unique symbol = Internal.ConfigErrorTypeId

/**
 * @since 2.0.0
 * @category errors
 */
export type ConfigErrorTypeId = typeof ConfigErrorTypeId

/**
 * @since 2.0.0
 * @category errors
 */
export interface ConfigFileError extends YieldableError {
  readonly [ConfigErrorTypeId]: ConfigErrorTypeId
  readonly _tag: "ConfigFileError"
  readonly message: string
}

/**
 * @since 2.0.0
 * @category errors
 */
export const ConfigFileError: (message: string) => ConfigFileError = Internal.ConfigFileError

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeProvider: (
  fileName: string,
  options?:
    | {
      readonly formats?: ReadonlyArray<Kind>
      readonly searchPaths?: ReadonlyArray<string>
    }
    | undefined
) => Effect<ConfigProvider, ConfigFileError, Path | FileSystem> = Internal.makeProvider

/**
 * @since 2.0.0
 * @category layers
 */
export const layer: (
  fileName: string,
  options?:
    | {
      readonly formats?: ReadonlyArray<Kind>
      readonly searchPaths?: ReadonlyArray<string>
    }
    | undefined
) => Layer<never, ConfigFileError, Path | FileSystem> = Internal.layer
