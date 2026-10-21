import * as Cause from "effect/Cause"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import type * as Redacted from "effect/Redacted"
import type * as Scope from "effect/Scope"

import * as OAuth from "../../../../oauth/OAuth.ts"
import type * as Oidc from "../../../../oauth/Oidc.ts"
import { OAuthUnavailable } from "../../signInErrors.ts"
import { makeEmailEnrichment } from "../github/email.ts"
import { OpenIdConnectConfigurationError } from "./models.ts"

/** Provider construction captures explicit platform/crypto services within its Scope. */
export type Requirements = SecureRandom.SecureRandom | Digest.Digest | HttpClient.HttpClient | Scope.Scope

/** @internal */
export interface NativeProvider {
  readonly client: OAuth.Client
  readonly enrichIdentity?: Effect.Success<ReturnType<typeof makeEmailEnrichment>>
  readonly verifier?: {
    readonly verify: (
      token: Redacted.Redacted<string>,
      input: Oidc.VerificationInput
    ) => Effect.Effect<Oidc.Verified, Effect.Error<ReturnType<Oidc.Verifier["verify"]>>>
  }
}

/** @internal */
export const install = Effect.fn("OpenIdConnect.installNative")(function*(
  options: OAuth.ClientOptions & { readonly timeout: number },
  githubVerifiedPrimaryEmail = false
) {
  const client = yield* OAuth.make(options).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) =>
          error._tag === "OAuthConfigurationError"
            ? OpenIdConnectConfigurationError.make({ reason: "metadata" })
            : OAuthUnavailable.make({}))
      )
    )
  )

  return {
    client,
    ...(githubVerifiedPrimaryEmail
      ? { enrichIdentity: yield* makeEmailEnrichment(options.timeout) }
      : {})
  }
})
