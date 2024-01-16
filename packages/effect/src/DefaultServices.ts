/**
 * @since 2.0.0
 */
import type * as Context from "./Context.js"
import type * as FiberRef from "./FiberRef.js"
import * as internal from "./internal/defaultServices.js"

/**
 * @since 2.0.0
 * @category models
 */
export type DefaultServices =
  | "Clock"
  | "Console"
  | "Random"
  | "ConfigProvider"
  | "Tracer"

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
