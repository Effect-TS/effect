import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { OperationFetchClient } from "../httpOperation/client.ts"
import type { AnyRoute, RouteFailure, RouteInput, RouteSuccess } from "../httpOperation/contract.ts"
import type { OperationHttpError } from "../httpOperation/errors.ts"

/** Each workflow invocation owns one generation fence. Device work stays
 * interruptible; its final authentication call and subject publication settle together. */
export class AuthAtomWorkflow extends Context.Service<
  AuthAtomWorkflow,
  {
    readonly call: OperationFetchClient["call"]
    /** Check after browser/device work before making the next operation call. */
    readonly current: Effect.Effect<void, OperationHttpError>
    readonly completeAuthentication: <Route extends AnyRoute>(
      route: Route,
      input: RouteInput<Route>,
      subject: (value: RouteSuccess<Route>) => string | null | undefined
    ) => Effect.Effect<
      RouteSuccess<Route>,
      RouteFailure<Route> | OperationHttpError,
      | Route["operation"]["rpc"]["successSchema"]["DecodingServices"]
      | Route["operation"]["rpc"]["errorSchema"]["DecodingServices"]
    >
  }
>()("@effect/auth/AuthAtomWorkflow") {}
