/**
 * @since 1.0.0
 */
import type * as Error from "@effect/platform/WorkerError"
import type * as Runner from "@effect/platform/WorkerRunner"
import type { RpcRouter } from "@effect/rpc/Router"
import type { Effect } from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as internal from "./internal/server"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (router: RpcRouter.Base) => Effect<Scope | Runner.PlatformRunner, Error.WorkerError, void> =
  internal.make
