import type * as Redacted from "effect/Redacted"

import type { OAuthConnectedProfile } from "../../permissionProfile.ts"
import { OAuthProviderKey } from "../../schema.ts"
import type { OAuthProtocolConfiguration } from "../../signInModels.ts"

export const gitHubOAuthAppProviderKey = OAuthProviderKey.make("github")

/** GitHub.com OAuth App credentials, distinct from GitHub App installation or user tokens. */
export interface GitHubOAuthAppGeneration {
  readonly configurationGeneration: OAuthProtocolConfiguration["configurationGeneration"]
  readonly issuance: "active" | "retired"
  readonly clientId: string
  readonly clientSecret: Redacted.Redacted<string>
  /** Opt in to user:email and a verified primary email lookup. Defaults to false.
   * Connected profiles must explicitly include user:email; their scopes are not expanded. */
  readonly verifiedPrimaryEmail?: boolean
  readonly callbacks: ReadonlyArray<{
    readonly callbackId: OAuthProtocolConfiguration["callbackId"]
    readonly redirectUri: OAuthProtocolConfiguration["redirectUri"]
  }>
}

export interface GitHubOAuthAppProtocolOptions {
  readonly registrations: ReadonlyArray<GitHubOAuthAppGeneration>
  readonly timeoutSeconds: number
}

export interface GitHubOAuthAppConnectedProtocolOptions {
  readonly registrations: ReadonlyArray<
    GitHubOAuthAppGeneration & {
      /** Each profile uses provider "github" and its actual clientId as clientRegistrationId. */
      readonly profiles: ReadonlyArray<OAuthConnectedProfile>
    }
  >
  readonly timeoutSeconds: number
}
