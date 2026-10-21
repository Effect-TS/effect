import * as Schema from "effect/Schema"

import {
  httpsServerBase,
  tenantOidcProvider,
  type TenantOidcProviderOptions,
  tenantOidcRegistration
} from "../shared/oidcTenant.ts"

const realm = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(255),
  Schema.isPattern(/^[A-Za-z0-9._-]+$/)
)

const Registration = tenantOidcRegistration({
  url: httpsServerBase,
  realm
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = TenantOidcProviderOptions<ProviderRegistration>

/** Keycloak issuer for one realm. url is the server origin plus an optional
 * path prefix such as /auth for older deployments. */
export const issuer = (input: { readonly url: string; readonly realm: string }): string =>
  `${input.url.replace(/\/$/u, "")}/realms/${input.realm}`

/** Sign in with a customer Keycloak realm through the shared OIDC implementation.
 * Defaults to the openid scope, client_secret_basic, S256 PKCE and advertised
 * algorithms. Keycloak advertises the RFC 9207 response issuer parameter, so
 * the preset requires it. No UserInfo request or retained API access is
 * installed. Credentials are captured when the host builds its Layer; supply
 * HttpClient and crypto in that Scope. */
export const provider = tenantOidcProvider(Registration, (registration) => ({
  issuer: issuer(registration),
  responseIssuerMode: "required"
}))
