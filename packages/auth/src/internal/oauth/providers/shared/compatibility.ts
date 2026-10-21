import type * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

import type { OAuthProtocolRejected, OAuthUnavailable } from "../../signInErrors.ts"
import type { OpenIdConnectConnectedOAuthProvider, OpenIdConnectConnectedProtocolOptions } from "./connected/models.ts"

/**
 * Private provider receipt rules, never part of the generic public options.
 *
 * @internal
 */
export interface TokenCompatibility {
  readonly inspectReceipt: (
    receipt: {
      readonly body: unknown
      readonly status: number
      readonly contentType: string | null
    },
    input: {
      readonly scopes: ReadonlyArray<string>
      readonly refreshRequired: boolean
      readonly operation: "authorization_code" | "refresh_token"
    }
  ) => Effect.Effect<void, OAuthProtocolRejected | OAuthUnavailable>
}

/**
 * First-party rules travel with the exact provider generation. The symbol stays
 * private so generic provider options do not expose grant-bearing hooks.
 *
 * @internal
 */
export const tokenCompatibility = Symbol("effect-auth/OpenIdConnect/tokenCompatibility")

/**
 * Private first-party capability; it never exposes a grant to an application decoder.
 *
 * @internal
 */
export const githubVerifiedPrimaryEmail = Symbol("effect-auth/GitHub/verifiedPrimaryEmail")

/** @internal */
export const TokenCompatibility = Schema.declare<TokenCompatibility>(
  (input): input is TokenCompatibility =>
    Predicate.isObject(input) &&
    "inspectReceipt" in input &&
    Predicate.isFunction(input.inspectReceipt)
)

/** @internal */
export interface ConnectedCompatibility extends TokenCompatibility {
  readonly authorizationScopes: (
    scopes: ReadonlyArray<string>,
    refresh: boolean
  ) => ReadonlyArray<string>
  readonly decodeScopes: (
    receipt: string | undefined,
    expected: ReadonlyArray<string>
  ) => Effect.Effect<ReadonlyArray<string>, OAuthUnavailable>
  readonly includeRefreshScope: boolean
}

/** @internal */
export type ProviderConnectedOAuth<R> =
  & Omit<
    OpenIdConnectConnectedOAuthProvider<R>,
    "revocation"
  >
  & {
    readonly revocation: { readonly mode: "provider-cohort" }
  }

/** @internal */
export type ConnectedOptions<R> = Omit<OpenIdConnectConnectedProtocolOptions<R>, "providers"> & {
  readonly providers: ReadonlyArray<
    OpenIdConnectConnectedProtocolOptions<R>["providers"][number] | ProviderConnectedOAuth<R>
  >
}
