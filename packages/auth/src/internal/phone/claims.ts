import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { SubjectId } from "../../Schema.ts"
import type { PhoneCredentialSnapshot, PhoneOtpUnavailable } from "./models.ts"

/**
 * Application session claims, shared by sign-in and lifecycle operations in one namespace.
 *
 * @internal
 */
export const makePhoneClaims = <
  const Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id
) =>
  Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "phone-claims"
      readonly claims: Types.Invariant<Claims["Type"]>
    },
    {
      readonly resolve: (input: {
        readonly subjectId: SubjectId
        readonly credential: PhoneCredentialSnapshot
      }) => Effect.Effect<Claims["Type"], PhoneOtpUnavailable>
    }
  >(`@effect/auth/ClaimsForPhone/${moduleId.length}:${moduleId}`)
