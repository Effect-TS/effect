import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import type { Geolocation } from "../Geolocation.js"

/** @internal */
export const tag = Context.GenericTag<Geolocation>("@effect/platform-browser/Geolocation")

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
      Stream.async<GeolocationPosition, GeolocationPositionError>((emit) => {
        const handlerId = navigator.geolocation.watchPosition(
          (position) => emit(Effect.succeed(Chunk.of(position))),
          (error) => emit(Effect.fail(Option.some(error))),
          options
        )

        return Effect.sync(() => navigator.geolocation.clearWatch(handlerId))
      })
  }
)
