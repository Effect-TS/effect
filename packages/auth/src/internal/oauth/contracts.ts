import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
import { IdentityConflict } from "../identity/models.ts"
import { action } from "../operations/actions.ts"
import { AuthenticationRequired } from "../operations/errors.ts"
import { OAuthLinkedAccountsList, OAuthLinkedAccountsListResult } from "./accountsModels.ts"
import { OAuthGrantId, OAuthPermissionProfileKey } from "./permissionProfile.ts"
import {
  OAuthRegistrationPrivateInput,
  OAuthRegistrationRequired,
  OAuthRegistrationResult,
  registrationCompletionResult
} from "./registrationModels.ts"
import { OAuthMethodUnsupported, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import { OAuthReturnTarget, OAuthSignInAuthorization, OAuthSignInComplete, OAuthSignInInput } from "./signInModels.ts"

const Failure = Schema.Union([OAuthRejected, OAuthUnavailable, OAuthMethodUnsupported, HookDenied])

/** @internal */
export const completionResult = <S extends Schema.Top>(schema: S) =>
  Schema.Union([
    Schema.Struct({
      completion: schema,
      returnTarget: OAuthReturnTarget,
      connection: Schema.optionalKey(
        Schema.Struct({ grantId: OAuthGrantId, profileKey: OAuthPermissionProfileKey })
      )
    }),
    Schema.TaggedStruct("Cancelled", { returnTarget: OAuthReturnTarget }),
    OAuthRegistrationRequired
  ])

/** Start a fresh attempt. IDs and the default callback are resolved on the server;
 * credentials are delivered by the request boundary. This action is not replayable. */
export const signIn = (options?: { readonly strategy?: string }) =>
  action({
    payload: OAuthSignInInput,
    success: OAuthSignInAuthorization,
    error: Failure,
    mode: "mutation",
    credentials: true,
    method: "signIn",
    ...options
  })

type Completion =
  | { readonly _tag: "Authenticated"; readonly session: { readonly subjectId: string } }
  | { readonly _tag: "PendingAuthentication" }

/** Identifies the callback capability explicitly, including its private binding
 * and single-use contract. The public action name may be chosen by the app. */
export const completeSignIn = <S extends Schema.Codec<Completion, unknown, unknown, unknown>>(
  schemas: { readonly CompletionResult: S },
  options?: { readonly strategy?: string }
) =>
  action({
    payload: Schema.Struct({
      flowId: OAuthSignInComplete.fields.flowId,
      provider: OAuthSignInComplete.fields.provider,
      callbackId: OAuthSignInComplete.fields.callbackId,
      response: OAuthSignInComplete.fields.response
    }),
    success: completionResult(schemas.CompletionResult),
    error: Failure,
    mode: "mutation",
    replay: "single-use",
    credentials: true,
    method: "completeSignIn",
    oauthCallback: true,
    requestFields: { requestBinding: "request-binding" },
    ...options,
    subject: {
      fromSuccess: (value) =>
        "completion" in value && value.completion._tag === "Authenticated"
          ? value.completion.session.subjectId
          : undefined
    }
  })

/** Opt-in completion is first-confirmed only; every replay returns RegistrationAccepted. */
export const register = <
  S extends Schema.Codec<Completion, unknown, unknown, unknown>,
  Registration extends Schema.Top,
  Authenticate extends boolean = false
>(
  schemas: { readonly CompletionResult: S },
  registration: Registration,
  options?: { readonly strategy?: string; readonly authenticate?: Authenticate }
) => {
  // This selection mirrors the strategy constructor without widening default acceptance.
  const success = (
    options?.authenticate === true
      ? registrationCompletionResult(schemas.CompletionResult)
      : OAuthRegistrationResult
  ) as Authenticate extends true ? ReturnType<typeof registrationCompletionResult<S>>
    : typeof OAuthRegistrationResult

  return action({
    payload: Schema.Struct({
      reference: OAuthRegistrationPrivateInput.fields.reference,
      flowId: OAuthRegistrationPrivateInput.fields.flowId,
      commandId: OAuthRegistrationPrivateInput.fields.commandId,
      registration
    }),
    success,
    error: Schema.Union([Failure, IdentityConflict]),
    mode: "mutation",
    replay: "single-use",
    credentials: true,
    method: "register",
    requestFields: { requestBinding: "request-binding", credential: "registration" },
    ...(options?.strategy === undefined ? {} : { strategy: options.strategy }),
    subject: {
      fromSuccess: (value) => value._tag === "Authenticated" ? value.session.subjectId : undefined
    }
  })
}

/** List the authenticated subject's login identities, independently of API grants. */
export const listLinkedAccounts = (options?: { readonly strategy?: string }) =>
  action({
    payload: OAuthLinkedAccountsList,
    success: OAuthLinkedAccountsListResult,
    error: Schema.Union([AuthenticationRequired, OAuthUnavailable, OAuthMethodUnsupported]),
    mode: "query",
    method: "listLinkedAccounts",
    ...options
  })
