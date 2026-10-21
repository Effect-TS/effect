import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { discoveryProfile } from "../shared/discovery.ts"
import { provider as oidcProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { MicrosoftUserProfile } from "./profile.ts"

const entraId = Schema.String.check(
  Schema.isPattern(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u
  )
)

const Tenant = Schema.Union([Schema.Literals(["common", "organizations", "consumers"]), entraId])

const Scope = Schema.Literals(["openid", "profile", "email", "offline_access"])

/** Personal Microsoft account tenant; `consumers` is this GUID's nickname. */
const personalMicrosoftAccountTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"

const identityScopes = (scopes: ReadonlyArray<typeof Scope.Type> | undefined) => [
  "openid" as const,
  "profile" as const,
  ...(scopes ?? []).filter((scope) => scope !== "openid" && scope !== "profile")
]

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  tokenEndpointAuthMethod: Schema.optionalKey(
    Schema.Literals(["client_secret_basic", "client_secret_post"])
  ),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Schema.Array(Scope)),
  tenant: Schema.optionalKey(Tenant)
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

const MicrosoftIdentity = Schema.Struct({ oid: entraId, tid: entraId })

const decodeSubject = (claims: unknown) =>
  Schema.decodeUnknownEffect(MicrosoftIdentity)(claims).pipe(
    Effect.map(({ oid, tid }) => `${oid}:${tid}`),
    Effect.mapError(() => OAuthProtocolRejected.make({}))
  )

const issuerFor = (tenant: typeof Tenant.Type | undefined) => {
  const authority = tenant === "consumers" ? personalMicrosoftAccountTenant : (tenant ?? "common")

  return `https://login.microsoftonline.com/${authority}/v2.0`
}

/** Sign in with Microsoft Entra ID through the shared OIDC implementation.
 * Defaults to tenant common, the openid and profile scopes, client_secret_basic,
 * S256 PKCE and advertised RS256. Profile is always requested because oid
 * requires it. The durable subject is oid:tid when the token issuer equals the
 * configured authority, and tid:oid:tid when it does not. Never use email or the
 * pairwise sub. MicrosoftUserProfile is carried through ID-token
 * projection. Entra does not advertise RFC 9207 iss or S256; the HTTP host must
 * give it a distinct callback, and the preset supplies the missing PKCE
 * advertisement for this issuer's endpoints. Photo requires an application-owned
 * Graph call. Credentials are captured when the host builds its Layer; supply
 * HttpClient and crypto in that Scope. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      return yield* oidcProvider({
        registrations: registrations.map(({ tenant, scopes, ...registration }) => ({
          ...registration,
          scopes: identityScopes(scopes),
          protocol: "oidc" as const,
          issuer: issuerFor(tenant),
          responseIssuerMode: "unsupported" as const,
          profileSchema: MicrosoftUserProfile,
          decodeSubject,
          [discoveryProfile]: "microsoft" as const
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
