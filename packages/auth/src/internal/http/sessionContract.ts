import * as Context from "effect/Context"
import * as HttpApiMiddleware from "effect/http-api/HttpApiMiddleware"
import * as HttpApiSecurity from "effect/http-api/HttpApiSecurity"
import type * as HttpRouter from "effect/http/HttpRouter"
import type * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { AuthRequest } from "../auth/authRequest.ts"
import { HookDenied } from "../hooks/models.ts"
import {
  AssuranceRequired,
  AuthenticationRequired,
  OperationBoundaryError,
  OperationForbidden
} from "../operations/errors.ts"
import { SessionError, SessionInvalid, SessionSignOutUnavailable, SessionUnavailable } from "../sessions/errors.ts"

/** Existing domain failures with HTTP statuses, without changing their wire values. */
const sessionHttpErrors = [
  ...SessionError.members.map((member) =>
    member.annotate({
      httpApiStatus: member === SessionInvalid
        ? 401
        : member === SessionUnavailable || member === SessionSignOutUnavailable
        ? 503
        : 400
    })
  ),
  ...OperationBoundaryError.members.map((member) =>
    member.annotate({
      httpApiStatus: member === AuthenticationRequired
        ? 401
        : member === OperationForbidden || member === AssuranceRequired
        ? 403
        : 400
    })
  ),
  HookDenied.annotate({ httpApiStatus: 403 })
]

export interface SessionHttpService<Id extends string, Kind extends string, Session> {
  readonly namespace: Id
  readonly kind: Kind
  readonly session: Types.Invariant<Session>
}

export type SessionHttpAuthorization<Id extends string, Session> =
  & SessionHttpService<
    Id,
    "require",
    Session
  >
  & {
    readonly [Key in keyof HttpApiMiddleware.AnyId]: {
      readonly provides: SessionHttpService<Id, "session", Session>
      readonly requires: HttpRouter.Request.From<"Requires", AuthRequest>
      readonly error: typeof sessionHttpErrors
      readonly clientError: never
      readonly requiredForClient: false
    }
  }

/** Shared HttpApi security metadata and authenticated session service.
 * The server implementation requires the validated request supplied by AuthHttp.middleware.
 * Keep this declaration beside the application's shared API, outside server setup.
 */
export const makeSessionHttpContract = <const Id extends string, S extends Schema.Top>(
  id: Id,
  session: S,
  options: { readonly cookieName: string }
) => {
  const cookieName = options.cookieName

  const CurrentSession = Context.Service<SessionHttpService<Id, "session", S["Type"]>, S["Type"]>(
    `${id}/CurrentSession`
  )

  const RequireSession = HttpApiMiddleware.Service<
    SessionHttpAuthorization<Id, S["Type"]>,
    {
      provides: SessionHttpService<Id, "session", S["Type"]>
      requires: HttpRouter.Request.From<"Requires", AuthRequest>
    }
  >()(`${id}/RequireSession`, {
    security: { session: HttpApiSecurity.apiKey({ in: "cookie", key: cookieName }) },
    error: sessionHttpErrors
  })

  return Object.freeze({ id, CurrentSession, RequireSession, session, cookieName })
}
