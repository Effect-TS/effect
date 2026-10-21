import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"

/**
 * Keep explicitly supplied services. Shared Layer values also share their resources.
 *
 * @internal
 */
export const defaultLayer = <I, S, E, R>(
  service: Context.Key<I, S>,
  fallback: Layer.Layer<I, E, R>
): Layer.Layer<I, E, R> =>
  Layer.unwrap(
    Effect.map(Effect.serviceOption(service), (current) =>
      Option.isSome(current) ? Layer.succeed(service, current.value) : fallback)
  )

export const hooksLayer = defaultLayer(LifecycleHooks, LifecycleHooks.empty)
