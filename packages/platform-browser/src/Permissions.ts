/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform-browser/Permissions")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Wrapper on the Permission API (`navigator.permissions`)
 * with methods for querying status of permissions.
 *
 * @since 1.0.0
 * @category interface
 */
export interface Permissions {
  readonly [TypeId]: TypeId

  /**
   * Returns the state of a user permission on the global scope.
   */
  readonly query: <Name extends PermissionName>(
    name: Name
  ) => Effect.Effect<
    // `name` is identical to the name passed to Permissions.query
    // https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus
    Omit<PermissionStatus, "name"> & { name: Name },
    PermissionsError
  >
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform-browser/Permissions/PermissionsError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class PermissionsError extends TypeIdError(ErrorTypeId, "PermissionsError")<{
  /** https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query#exceptions */
  readonly reason: "InvalidStateError" | "TypeError"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Permissions: Context.Tag<Permissions, Permissions> = Context.GenericTag<Permissions>(
  "@effect/platform-browser/Permissions"
)

/**
 * A layer that directly interfaces with the `navigator.permissions` api
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Permissions> = Layer.succeed(
  Permissions,
  Permissions.of({
    [TypeId]: TypeId,
    query: (name) =>
      Effect.tryPromise({
        try: () => navigator.permissions.query({ name }) as Promise<any>,
        catch: (cause) =>
          new PermissionsError({
            reason: cause instanceof DOMException ? "InvalidStateError" : "TypeError",
            cause
          })
      })
  })
)
