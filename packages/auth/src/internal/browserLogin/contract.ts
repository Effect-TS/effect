import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
import { make as httpContract, route } from "../httpOperation/contract.ts"
import { makeOperation } from "../operations/operation.ts"
import { SessionError } from "../sessions/errors.ts"
import { SessionId } from "../sessions/models.ts"
import {
  AuthorizationDecision,
  Binding,
  Description,
  Indeterminate,
  Initiate,
  Invalid,
  Random,
  Started,
  Status,
  Unavailable
} from "./models.ts"

/** Share this contract between hosted login and native hosts. */
export const makeContract = <
  const Id extends string,
  S extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  namespace: Id,
  session: S,
  options: { readonly basePath: string }
) => {
  const common = {
    exposure: "public",
    error: Schema.Union([Invalid, Unavailable, Indeterminate, SessionError, HookDenied])
  } as const

  const initiate = makeOperation(`${namespace}/browser-login/initiate`, {
    ...common,
    payload: Initiate,
    success: Started,
    access: "any",
    replay: "non-idempotent"
  })

  const authorize = makeOperation(`${namespace}/browser-login/authorize`, {
    ...common,
    payload: Schema.Struct({
      attemptId: Random,
      decision: AuthorizationDecision,
      /** Bind consent to the displayed session or the explicit sign-in result. Never authority. */
      expectedSessionId: SessionId,
      credential: Schema.RedactedFromValue(Schema.NonEmptyString)
    }),
    success: Schema.Struct({
      callbackUrl: Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(2304)))
    }),
    access: "authenticated",
    replay: "single-use"
  })

  const describe = makeOperation(`${namespace}/browser-login/describe`, {
    ...common,
    payload: Schema.Struct({ attemptId: Random }),
    success: Description,
    access: "any",
    replay: "read-only"
  })

  const exchange = makeOperation(`${namespace}/browser-login/exchange`, {
    ...common,
    payload: Schema.Struct({ ...Binding.fields, code: Schema.RedactedFromValue(Random) }),
    success: session,
    access: "any",
    replay: "single-use",
    credentials: true
  })

  const status = makeOperation(`${namespace}/browser-login/status`, {
    ...common,
    payload: Binding,
    success: Status,
    access: "any",
    replay: "read-only"
  })

  const cancel = makeOperation(`${namespace}/browser-login/cancel`, {
    ...common,
    payload: Binding,
    success: Schema.Void,
    access: "any",
    replay: "idempotent"
  })

  const http = httpContract({
    initiate: route(initiate, { path: `${options.basePath}/initiate` }),
    describe: route(describe, { path: `${options.basePath}/describe` }),
    authorize: route(authorize, {
      path: `${options.basePath}/authorize`,
      credentials: { credential: "session" }
    }),
    exchange: route(exchange, { path: `${options.basePath}/exchange` }),
    status: route(status, { path: `${options.basePath}/status` }),
    cancel: route(cancel, { path: `${options.basePath}/cancel` })
  })

  return {
    namespace,
    session,
    operations: { initiate, describe, authorize, exchange, status, cancel },
    ...http
  }
}
