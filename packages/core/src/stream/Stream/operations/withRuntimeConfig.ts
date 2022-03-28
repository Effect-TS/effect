import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Managed } from "../../../io/Managed"
import type { RuntimeConfig } from "../../../io/RuntimeConfig"
import { Stream } from "../definition"

/**
 * Runs this stream on the specified runtime configuration. Any streams that
 * are composed after this one will be run on the previous executor.
 *
 * @tsplus fluent ets/Stream withRuntimeConfig
 */
export function withRuntimeConfig_<R, E, A>(
  self: Stream<R, E, A>,
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.fromEffect(Effect.runtimeConfig).flatMap(
    (currentRuntimeConfig) =>
      Stream.managed(Managed.withRuntimeConfig(runtimeConfig)) >
      self <
      Stream.fromEffect(Effect.setRuntimeConfig(currentRuntimeConfig))
  )
}

/**
 * Runs this stream on the specified runtime configuration. Any streams that
 * are composed after this one will be run on the previous executor.
 */
export const withRuntimeConfig = Pipeable(withRuntimeConfig_)
