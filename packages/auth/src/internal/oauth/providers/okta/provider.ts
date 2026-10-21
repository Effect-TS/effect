import * as Schema from "effect/Schema"

import {
  dnsHostname,
  tenantOidcProvider,
  type TenantOidcProviderOptions,
  tenantOidcRegistration
} from "../shared/oidcTenant.ts"

const authorizationServer = Schema.Union([
  Schema.Literal("org"),
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(64),
    Schema.isPattern(/^[A-Za-z0-9_-]+$/)
  )
])

const Registration = tenantOidcRegistration({
  domain: dnsHostname,
  authorizationServer: Schema.optionalKey(authorizationServer)
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = TenantOidcProviderOptions<ProviderRegistration>

/** Okta issuer for one customer. Defaults to the default custom authorization
 * server. Pass authorizationServer "org" for the org authorization server. */
export const issuer = (input: {
  readonly domain: string
  readonly authorizationServer?: typeof authorizationServer.Type
}): string =>
  input.authorizationServer === "org"
    ? `https://${input.domain}`
    : `https://${input.domain}/oauth2/${input.authorizationServer ?? "default"}`

/** Sign in with a customer Okta org through the shared OIDC implementation.
 * Defaults to the openid scope, client_secret_basic, S256 PKCE and advertised
 * RS256. Okta does not advertise response iss; the HTTP host must give it a
 * distinct callback. No UserInfo request or retained API access is installed.
 * Credentials are captured when the host builds its Layer; supply HttpClient
 * and crypto in that Scope. */
export const provider = tenantOidcProvider(Registration, (registration) => ({
  issuer: issuer(registration)
}))
