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

/** Zitadel issuer for one instance. Cloud instances use {name}.zitadel.cloud;
 * self-hosted instances use their DNS name. */
export const issuer = (input: { readonly domain: string }): string => `https://${input.domain}`

/** Sign in with a customer Zitadel instance through the shared OIDC
 * implementation. Defaults to the openid scope, client_secret_basic, S256 PKCE
 * and advertised algorithms. Zitadel does not advertise response iss; the HTTP
 * host must give it a distinct callback. No UserInfo request or retained API
 * access is installed. Credentials are captured when the host builds its Layer;
 * supply HttpClient and crypto in that Scope. */
export const provider = tenantOidcProvider(Registration, (registration) => ({
  issuer: issuer(registration)
}))
