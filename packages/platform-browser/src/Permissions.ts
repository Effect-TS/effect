/**
 * Wrapper on the Permission API (`navigator.permissions`)
 * with methods for querying status of permissions.
 *
 * @since 1.0.0
 */

import type { PlatformError } from "@effect/platform/Error"
import type { Tag } from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/permissions.js"

/**
 * @since 1.0.0
 * @category interface
 */
export interface Permissions {
  /**
   * Returns the state of a user permission on the global scope.
   */
  readonly query: <Name extends PermissionName>(
    name: Name
  ) => Effect.Effect<
    // `name` is identical to the name passed to Permissions.query
    // https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus
    Omit<PermissionStatus, "name"> & { name: Name },
    PlatformError
  >
}

/**
 * @since 1.0.0
 * @category constructor
 */
export const make: (
  impl: Permissions
) => Permissions = internal.make

/**
 * @since 1.0.0
 * @category tag
 */
export const Permissions: Tag<Permissions, Permissions> = internal.tag

/**
 * A layer that directly interfaces with the `navigator.permissions` api
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Permissions> = internal.layer
