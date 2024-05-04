import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import type * as Geolocation from "../Geolocation.js"

/** @internal */
export const tag = Context.GenericTag<Geolocation.Geolocation>("@effect/platform-browser/Geolocation")

/** @internal */
export const layer = Layer.succeed(
  tag,
  {
    getCurrentPosition: (options?: PositionOptions) =>
      Effect.async<GeolocationPosition, GeolocationPositionError>((resume) =>
        navigator.geolocation.getCurrentPosition(
          (position) => resume(Effect.succeed(position)),
          (error) => resume(Effect.fail(error)),
          options
        )
      ),
    watchPosition: (options?: PositionOptions) =>
      Stream.async<
        Either.Either<
          GeolocationPosition,
          Geolocation.GeolocationPositionUnavailableError | Geolocation.GeolocationTimeoutError
        >,
        Geolocation.GeolocationPermissionDeniedError
      >(
        (emit) => {
          const handlerId = navigator.geolocation.watchPosition(
            (position) => emit.single(Either.right(position)),
            (error) => {
              if (error.code === error.PERMISSION_DENIED) {
                navigator.geolocation.clearWatch(handlerId)
                emit.fail(error as Geolocation.GeolocationPermissionDeniedError)
              } else {
                emit.single(Either.left(
                  error as Geolocation.GeolocationPositionUnavailableError | Geolocation.GeolocationTimeoutError
                ))
              }
            },
            options
          )

          return Effect.sync(() => navigator.geolocation.clearWatch(handlerId))
        }
      )
  }
)
