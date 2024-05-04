/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
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
  readonly watchPosition: (
    options?: PositionOptions
  ) => Stream<
    Either<GeolocationPosition, GeolocationTimeoutError | GeolocationPositionUnavailableError>,
    GeolocationPermissionDeniedError
  >
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

/**
 * @since 1.0.0
 * @category type
 */
export interface GeolocationPermissionDeniedError extends GeolocationPositionError {
  code: GeolocationPositionError["PERMISSION_DENIED"]
}
/**
 * @since 1.0.0
 * @category type
 */
export interface GeolocationPositionUnavailableError extends GeolocationPositionError {
  code: GeolocationPositionError["POSITION_UNAVAILABLE"]
}
/**
 * @since 1.0.0
 * @category type
 */
export interface GeolocationTimeoutError extends GeolocationPositionError {
  code: GeolocationPositionError["TIMEOUT"]
}
