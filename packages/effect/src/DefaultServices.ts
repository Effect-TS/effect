/**
 * @since 2.0.0
 */
import type * as Clock from "./Clock"
import type * as ConfigProvider from "./ConfigProvider"
import type * as Console from "./Console"
import type * as Context from "./Context"
import type * as FiberRef from "./FiberRef"
import * as internal from "./internal/defaultServices"
import type * as Random from "./Random"
import type * as Tracer from "./Tracer"

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
