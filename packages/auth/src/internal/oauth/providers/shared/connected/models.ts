import type { OAuthConnectedProfile } from "../../../permissionProfile.ts"
import type { OpenIdConnectAuthentication, OpenIdConnectOAuthProvider, OpenIdConnectOidcProvider } from "../models.ts"

export type OpenIdConnectConnectedRevocation =
  | { readonly mode: "unsupported" }
  | {
    readonly mode: "rfc7009"
    /** Verified provider effects stay within the stable connected cohort.
     * This does not promise remote erasure of all sibling tokens. */
    readonly scope: "cohort"
    readonly tokenTypes: "access" | "access-and-refresh"
    readonly authentication: OpenIdConnectAuthentication
    /** Required for plain OAuth; OIDC overrides must equal discovery exactly. */
    readonly endpoint?: string
  }

export type OpenIdConnectConnectedRefreshExpiry =
  | "unreported"
  | {
    readonly field: "refresh_expires_in" | "refresh_token_expires_in"
    readonly zero: "unreported" | "expired"
  }

interface ConnectedProvider {
  readonly clientRegistrationId: OAuthConnectedProfile["clientRegistrationId"]
  readonly profiles: ReadonlyArray<OAuthConnectedProfile>
  /** Explicit issuer issuance contract. Values are declared grant targets,
   * not proof of an opaque access token's audience. */
  readonly resourceIndicators: "unsupported" | "rfc8707"
  readonly refreshParameters?: Readonly<Record<string, string>>
  readonly refreshExpiry: OpenIdConnectConnectedRefreshExpiry
  readonly revocation: OpenIdConnectConnectedRevocation
}

export interface OpenIdConnectConnectedOidcProvider
  extends Omit<OpenIdConnectOidcProvider, "scopes">, ConnectedProvider
{}

export interface OpenIdConnectConnectedOAuthProvider<R = never>
  extends Omit<OpenIdConnectOAuthProvider<R>, "scopes">, ConnectedProvider
{}

export interface OpenIdConnectConnectedProtocolOptions<R = never> {
  readonly providers: ReadonlyArray<
    OpenIdConnectConnectedOidcProvider | OpenIdConnectConnectedOAuthProvider<R>
  >
  readonly timeoutSeconds: number
}
