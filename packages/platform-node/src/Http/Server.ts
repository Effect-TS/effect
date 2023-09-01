/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/Server`](https://effect-ts.github.io/platform/platform/Http/Server.ts.html).
 */
import type { LazyArg } from "@effect/data/Function"
import type * as Config from "@effect/io/Config"
import type * as ConfigError from "@effect/io/ConfigError"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type * as Scope from "@effect/io/Scope"
import * as internal from "@effect/platform-node/internal/http/server"
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Server from "@effect/platform/Http/Server"
import type * as Http from "node:http"
import type * as Net from "node:net"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/Server"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Effect.Effect<Scope.Scope, never, Server.Server> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.Layer<never, never, Server.Server | Etag.Generator> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  evaluate: LazyArg<Http.Server>,
  options: Config.Config.Wrap<Net.ListenOptions>
) => Layer.Layer<never, ConfigError.ConfigError, Server.Server | Etag.Generator> = internal.layerConfig
