import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import * as OAuthScope from "../../../OAuthScope.ts"
import { AccessClaims, type Authentication, Scope, type Unavailable } from "./models.ts"

/** @internal */
export const standardOpenIdScopes = [
  OAuthScope.make("openid"),
  OAuthScope.make("profile"),
  OAuthScope.make("email")
]

const isStandardOpenIdScope = Schema.is(Schema.Literals(standardOpenIdScopes))

const makeResultSchema = <Scope extends OAuthScope.OAuthScope>(
  scope: Schema.Codec<Scope, string>
) =>
  Schema.Struct({
    scopes: Schema.Array(scope).check(Schema.isMaxLength(32)),
    claims: Schema.optionalKey(AccessClaims)
  })

export const OpenIdAuthorizationResult = makeResultSchema(Scope)

export type OpenIdAuthorizationResult<Scope extends OAuthScope.OAuthScope = OAuthScope.OAuthScope> = ReturnType<
  typeof makeResultSchema<Scope>
>["Type"]

/** @internal */
export const makeAuthorization = <const Id extends string, Scope extends OAuthScope.OAuthScope>(
  id: Id,
  scope: Schema.Codec<Scope, string>
) => {
  /** Recheck permission at code exchange and refresh. Return only requested
   * scopes; an empty result denies issuance. Claims never enter an ID token.
   */
  const Service = Context.Service<
    {
      readonly server: Id
      readonly kind: "openid-authorization"
      readonly scopes: Types.Invariant<Scope>
    },
    {
      readonly authorize: (input: {
        readonly authentication: Authentication
        readonly clientId: string
        readonly resource: string
        readonly scopes: ReadonlyArray<Scope>
        readonly grantType: "authorization_code" | "refresh_token"
      }) => Effect.Effect<OpenIdAuthorizationResult<Scope>, Unavailable>
    }
  >()(`@effect/auth/OAuthServer/${id}/Authorization`)

  return {
    Service,
    Result: makeResultSchema(scope),
    default: Service.of({
      authorize: ({ scopes }) =>
        Effect.succeed({
          scopes: scopes.filter(isStandardOpenIdScope)
        })
    })
  }
}
