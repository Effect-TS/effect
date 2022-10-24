import { ILayerScoped, ILayerSuspend } from "@effect/core/io/Layer/definition"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Construct a service layer from a value
 *
 * @tsplus static effect/core/io/Layer.Ops fromValue
 * @category conversions
 * @since 1.0.0
 */
export function fromValue<T, T1 extends T>(
  tag: Context.Tag<T>,
  service: LazyArg<T1>
): Layer<never, never, T> {
  return new ILayerSuspend(() =>
    new ILayerScoped(
      Effect.sync(service).map((service) =>
        pipe(
          Context.empty(),
          Context.add(tag)(service)
        )
      )
    )
  )
}
