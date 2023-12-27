/**
 * @since 1.0.0
 */
import type * as Error from "@effect/platform/WorkerError"
import type * as Runner from "@effect/platform/WorkerRunner"
import type { RpcRouter } from "@effect/rpc/Router"
import type * as Effect from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as internal from "./internal/server.js"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <R extends RpcRouter.Base>(router: R) => Effect.Effect<
  Scope | Runner.PlatformRunner | RpcRouter.Services<R>,
  Error.WorkerError,
  void
> = internal.make
