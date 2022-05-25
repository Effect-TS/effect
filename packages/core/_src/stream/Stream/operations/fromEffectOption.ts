import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty
 * `Stream`.
 *
 * @tsplus static ets/Stream/Ops fromEffectOption
 */
export function fromEffectOption<R, E, A>(
  effect: LazyArg<Effect<R, Option<E>, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.unwrap(
      effect().fold(
        (option) => option.fold(Channel.unit, (e) => Channel.fail(e)),
        (a) => Channel.write(Chunk.single(a))
      )
    )
  )
}
