/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Stream } from "effect/Stream"
import * as internal from "./internal/geolocation.js"

/**
 * @since 1.0.0
 * @category interface
 */
export interface Geolocation {
  readonly getCurrentPosition: (
    options?: PositionOptions
  ) => Effect<GeolocationPosition, GeolocationPositionError>
  readonly watchPosition: (options?: PositionOptions) => Stream<GeolocationPosition, GeolocationPositionError>
}

/**
 * @since 1.0.0
 * @category tag
 */
export const Geolocation: Tag<Geolocation, Geolocation> = internal.tag

/**
 * A layer that directly interfaces with the navigator.geolocation api
 *
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<Geolocation> = internal.layer
