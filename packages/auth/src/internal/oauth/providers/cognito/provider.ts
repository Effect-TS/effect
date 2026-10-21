import * as Schema from "effect/Schema"

import { tenantOidcProvider, type TenantOidcProviderOptions, tenantOidcRegistration } from "../shared/oidcTenant.ts"

const region = Schema.String.check(
  Schema.isMinLength(2),
  Schema.isMaxLength(32),
  Schema.isPattern(/^[a-z]{2}(?:-[a-z0-9]+)+$/)
)

const userPoolId = Schema.String.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z]{2}(?:-[a-z0-9]+)+_[A-Za-z0-9]+$/)
)

const Registration = tenantOidcRegistration({
  region,
  userPoolId
}).check(Schema.makeFilter((input) => input.userPoolId.startsWith(`${input.region}_`)))

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = TenantOidcProviderOptions<ProviderRegistration>

/** Cognito user-pool issuer. This is not the Hosted UI domain; discovery maps
 * authorize and token endpoints onto that domain. */
export const issuer = (input: { readonly region: string; readonly userPoolId: string }): string =>
  `https://cognito-idp.${input.region}.amazonaws.com/${input.userPoolId}`

/** Sign in with an Amazon Cognito user pool through the shared OIDC
 * implementation. Defaults to the openid scope, client_secret_basic, S256 PKCE
 * and advertised RS256. Cognito supports PKCE but omits it from discovery; the
 * preset supplies that missing advertisement only for cognito-idp issuers with
 * the pool JWKS URL. Cognito does not advertise response iss; the HTTP host
 * must give it a distinct callback. No UserInfo request or retained API access
 * is installed. Credentials are captured when the host builds its Layer;
 * supply HttpClient and crypto in that Scope. */
export const provider = tenantOidcProvider(Registration, (registration) => ({
  issuer: issuer(registration),
  discoveryProfile: "cognito"
}))
