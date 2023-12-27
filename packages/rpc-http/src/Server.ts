/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import type { RpcRouter } from "@effect/rpc/Router"
import * as internal from "./internal/server.js"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <R extends RpcRouter.Base>(
  router: R
) => App.Default<RpcRouter.Services<R>, RpcRouter.Errors<R> | ServerError.RequestError> = internal.make as any
