import * as Schema from "effect/Schema"

import { Email } from "../../../Schema.ts"
import { action } from "../../operations/actions.ts"
import { NewPasswordRejected, PasswordCheckUnavailable } from "../errors.ts"
import { PasswordActionRequired, PasswordMethodUnsupported, PasswordRejected, PasswordUnavailable } from "./errors.ts"

/**
 * Shared wire input; the server owns the authentication flow identifier.
 *
 * @internal
 */
export const PasswordSignInInput = Schema.Struct({
  email: Schema.String.check(Schema.isMaxLength(320)).pipe(Schema.decodeTo(Email)),
  password: Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(65536)))
})

type Completion =
  | { readonly _tag: "Authenticated"; readonly session: { readonly subjectId: string } }
  | { readonly _tag: "PendingAuthentication" }

/** Public password action, usable with sign-in-only and management installations. */
export const signIn = <S extends Schema.Codec<Completion, unknown, unknown, unknown>>(
  schemas: { readonly CompletionResult: S },
  options?: { readonly strategy?: string }
) =>
  action({
    payload: PasswordSignInInput,
    success: schemas.CompletionResult,
    error: Schema.Union([
      PasswordRejected,
      PasswordUnavailable,
      PasswordActionRequired,
      PasswordMethodUnsupported,
      NewPasswordRejected,
      PasswordCheckUnavailable
    ]),
    mode: "mutation",
    credentials: true,
    method: "signIn",
    ...options,
    subject: {
      fromSuccess: (value) => value._tag === "Authenticated" ? value.session.subjectId : undefined
    }
  })
