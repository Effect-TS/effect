import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"

import { selectCallback } from "../../callback.ts"
import { wipeConnectedMaterial } from "../../grantTokens.ts"
import { OAuthConnectedProtocol } from "../../oauthConnectedProtocol.ts"
import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthConfigurationError, OAuthUnavailable } from "../../signInErrors.ts"
import { OAuthCallbackId } from "../../signInModels.ts"
import { accessProfile } from "./access.ts"
import { providerKey, type ProviderOptions } from "./models.ts"
import { makeConnectedProtocol } from "./protocol.ts"

export const provider = (
  input: ProviderOptions
): ProviderDefinition<OAuthConfigurationError, HttpClient.HttpClient | SecureRandom.SecureRandom> => {
  const options = { ...input }

  return {
    configure: Effect.fn("Strava.provider")(function*(binding) {
      if (binding.provider !== providerKey) {
        return yield* OAuthConfigurationError.make({ reason: "policy" })
      }

      const profile = options.access ?? accessProfile({ clientId: options.clientId, scopes: ["read"] })

      const configured = yield* Effect.forEach(
        binding.callbacks,
        (callback) =>
          Effect.map(makeConnectedProtocol(options, profile, callback), (protocol) => ({
            ...callback,
            protocol
          }))
      )

      const connected = OAuthConnectedProtocol.of({
        prepareAuthorization: (input) =>
          selectCallback(providerKey, configured, input.callbackId)?.protocol.prepareAuthorization(
            input
          ) ?? OAuthUnavailable.make({}),
        exchangeGrant: (input) =>
          selectCallback(
            providerKey,
            configured,
            input.configuration.callbackId
          )?.protocol.exchangeGrant(input) ?? OAuthUnavailable.make({}),
        refreshGrant: (input) =>
          selectCallback(
            providerKey,
            configured,
            input.context.configuration.callbackId
          )?.protocol.refreshGrant(input) ?? OAuthUnavailable.make({}),
        revokeGrant: (input) =>
          selectCallback(
            providerKey,
            configured,
            input.context.configuration.callbackId
          )?.protocol.revokeGrant(input) ?? OAuthUnavailable.make({})
      })

      return {
        prepareAuthorization: (input) =>
          connected
            .prepareAuthorization({
              ...input,
              profile,
              callbackId: input.callbackId ?? OAuthCallbackId.make(providerKey)
            })
            .pipe(
              Effect.mapError((error) => error._tag === "OAuthProtocolRejected" ? OAuthUnavailable.make({}) : error)
            ),
        exchangeVerifiedIdentity: (input) =>
          connected
            .exchangeGrant({ ...input, configuration: { ...input.configuration, profile } })
            .pipe(
              Effect.map((grant) => {
                wipeConnectedMaterial(grant.material)

                return {
                  identity: grant.identity,
                  ...(grant.profile === undefined ? {} : { profile: grant.profile })
                }
              })
            ),
        ...(options.access === undefined ? {} : { connected })
      }
    })
  }
}
