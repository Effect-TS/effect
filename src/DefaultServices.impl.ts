/**
 * @since 2.0.0
 */
import type { Context } from "./Context.js"
import type { FiberRef } from "./FiberRef.js"
import * as internal from "./internal/defaultServices.js"

import type { DefaultServices } from "./DefaultServices.js"

/**
 * @since 2.0.0
 * @category constructors
 */
export const liveServices: Context<DefaultServices> = internal.liveServices

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentServices: FiberRef<Context<DefaultServices>> = internal.currentServices
