/**
 * Runs this stream on the specified runtime configuration. Any streams that
 * are composed after this one will be run on the previous executor.
 *
 * @tsplus static effect/core/stream/Stream.Aspects withRuntimeConfig
 * @tsplus pipeable effect/core/stream/Stream withRuntimeConfig
 */
export function withRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> =>
    Stream.fromEffect(Effect.runtimeConfig).flatMap(
      (currentRuntimeConfig) =>
        Stream.scoped(
              Effect.acquireRelease(
                Effect.setRuntimeConfig(runtimeConfig),
                () => Effect.setRuntimeConfig(currentRuntimeConfig)
              )
            ) >
            self <
          Stream.fromEffect(Effect.setRuntimeConfig(currentRuntimeConfig))
    )
}
