import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as AiError from "effect/unstable/ai/AiError"
import type { GoogleAuth, GoogleAuthOptions } from "google-auth-library"

export type { GoogleAuthOptions }

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

const authError = (cause: unknown): AiError.AiError =>
  AiError.make({
    module: "GoogleVertexClient",
    method: "accessToken",
    reason: new AiError.AuthenticationError({
      kind: "Unknown",
      metadata: {
        googleVertex: {
          message: cause instanceof Error ? cause.message : String(cause)
        }
      }
    })
  })

/**
 * Creates an Effect that obtains a Google Cloud OAuth access token using
 * `google-auth-library`. The underlying auth client is created lazily on first
 * use and reused for subsequent calls (the library refreshes tokens
 * internally).
 *
 * @internal
 */
export const accessTokenFromGoogleAuth = (
  options?: GoogleAuthOptions
): Effect.Effect<Redacted.Redacted<string>, AiError.AiError> => {
  let auth: Promise<GoogleAuth> | undefined

  const getAuth = () => {
    if (auth === undefined) {
      auth = import("google-auth-library").then(({ GoogleAuth }) => {
        return new GoogleAuth({ scopes: SCOPES, ...options })
      })
    }
    return auth
  }

  return Effect.tryPromise({
    try: () =>
      getAuth().then((auth) => auth.getAccessToken()).then((token) => {
        if (token == null) {
          throw new Error("Google Auth returned an empty access token")
        }
        return Redacted.make(token)
      }),
    catch: authError
  })
}
