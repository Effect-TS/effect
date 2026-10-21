import {
  dnsHostname,
  tenantOidcProvider,
  type TenantOidcProviderOptions,
  tenantOidcRegistration
} from "../shared/oidcTenant.ts"

const Registration = tenantOidcRegistration({
  domain: dnsHostname
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = TenantOidcProviderOptions<ProviderRegistration>

/** Auth0 issuer for one tenant. Auth0's discovery identifier includes the
 * trailing slash; Yielded preserves it. */
export const issuer = (input: { readonly domain: string }): string => `https://${input.domain}/`

/** Sign in with a customer Auth0 tenant through the shared OIDC implementation.
 * Defaults to the openid scope, client_secret_basic, S256 PKCE and advertised
 * RS256. Auth0 can advertise RFC 9207 iss. The preset follows that discovery
 * flag, and the HTTP host must still give it a distinct callback. No UserInfo
 * request or retained API access is installed. Credentials are captured when
 * the host builds its Layer; supply HttpClient and crypto in that Scope. */
export const provider = tenantOidcProvider(Registration, (registration) => ({
  issuer: issuer(registration),
  responseIssuerMode: "discovered"
}))
