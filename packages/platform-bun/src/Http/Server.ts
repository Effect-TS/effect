/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/Server`](https://effect-ts.github.io/platform/platform/Http/Server.ts.html).
 */
import type * as Config from "@effect/io/Config"
import type * as ConfigError from "@effect/io/ConfigError"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type * as Scope from "@effect/io/Scope"
import type * as Platform from "@effect/platform-bun/Http/Platform"
import * as internal from "@effect/platform-bun/internal/http/server"
import type * as Server from "@effect/platform/Http/Server"
import type { ServeOptions } from "bun"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/Server"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Effect.Effect<Scope.Scope, never, Server.Server> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Layer.Layer<never, never, Server.Server | Platform.Platform> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  options: Config.Config.Wrap<Omit<ServeOptions, "fetch" | "error">>
) => Layer.Layer<never, ConfigError.ConfigError, Server.Server | Platform.Platform> = internal.layerConfig
