/**
 * @since 2.0.0
 */
import type * as Clock from "effect/Clock"
import type * as ConfigProvider from "effect/ConfigProvider"
import type * as Console from "effect/Console"
import type * as Context from "effect/Context"
import type * as FiberRef from "effect/FiberRef"
import * as internal from "effect/internal/defaultServices"
import type * as Random from "effect/Random"
import type * as Tracer from "effect/Tracer"

/**
 * @since 2.0.0
 * @category models
 */
export type DefaultServices =
  | Clock.Clock
  | Console.Console
  | Random.Random
  | ConfigProvider.ConfigProvider
  | Tracer.Tracer

/**
 * @since 2.0.0
 * @category constructors
 */
export const liveServices: Context.Context<DefaultServices> = internal.liveServices

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentServices: FiberRef.FiberRef<Context.Context<DefaultServices>> = internal.currentServices
