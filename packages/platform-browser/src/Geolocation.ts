/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform-browser/Geolocation")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Geolocation {
  readonly [TypeId]: TypeId
  readonly getCurrentPosition: (
    options?: PositionOptions | undefined
  ) => Effect.Effect<GeolocationPosition, GeolocationError>
  readonly watchPosition: (
    options?:
      | PositionOptions & {
        readonly bufferSize?: number | undefined
      }
      | undefined
  ) => Stream.Stream<GeolocationPosition, GeolocationError>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Geolocation: Context.Tag<Geolocation, Geolocation> = Context.GenericTag<Geolocation>(
  "@effect/platform-browser/Geolocation"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform-browser/Geolocation/GeolocationError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class GeolocationError extends TypeIdError(ErrorTypeId, "GeolocationError")<{
  readonly reason: "PositionUnavailable" | "PermissionDenied" | "Timeout"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

const makeQueue = (
  options:
    | PositionOptions & {
      readonly bufferSize?: number | undefined
    }
    | undefined
) =>
  Queue.sliding<Either.Either<GeolocationPosition, GeolocationError>>(options?.bufferSize ?? 16).pipe(
    Effect.tap((queue) =>
      Effect.acquireRelease(
        Effect.sync(() =>
          navigator.geolocation.watchPosition(
            (position) => queue.unsafeOffer(Either.right(position)),
            (cause) => {
              if (cause.code === cause.PERMISSION_DENIED) {
                queue.unsafeOffer(Either.left(new GeolocationError({ reason: "PermissionDenied", cause })))
              } else if (cause.code === cause.TIMEOUT) {
                queue.unsafeOffer(Either.left(new GeolocationError({ reason: "Timeout", cause })))
              }
            },
            options
          )
        ),
        (handleId) => Effect.sync(() => navigator.geolocation.clearWatch(handleId))
      )
    )
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Geolocation> = Layer.succeed(
  Geolocation,
  Geolocation.of({
    [TypeId]: TypeId,
    getCurrentPosition: (options) =>
      makeQueue(options).pipe(
        Effect.flatMap(Queue.take),
        Effect.flatten,
        Effect.scoped
      ),
    watchPosition: (options) =>
      makeQueue(options).pipe(
        Effect.map(Stream.fromQueue),
        Stream.unwrapScoped,
        Stream.mapEffect(identity)
      )
  })
)

/**
 * @since 1.0.0
 * @category accessors
 */
export const watchPosition = (
  options?:
    | PositionOptions & {
      readonly bufferSize?: number | undefined
    }
    | undefined
): Stream.Stream<GeolocationPosition, GeolocationError, Geolocation> =>
  Stream.unwrap(Effect.map(Geolocation, (geolocation) => geolocation.watchPosition(options)))
