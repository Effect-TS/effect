import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { TokenDigest } from "../../Schema.ts"
import { make } from "./cryptography.ts"
import type { TotpUnavailable } from "./errors.ts"
import type { TotpSecretBinding, TotpSecretEnvelope } from "./models.ts"

/** Effectful TOTP primitives. Preserve RFC 6238 SHA-1, six
 * digits and 30-second steps, and the existing AES-GCM envelope/AAD and recovery
 * digest formats when replacing an implementation. Keys remain consumer-owned. */
export class TotpCryptography extends Context.Service<
  TotpCryptography,
  {
    readonly randomId: () => Effect.Effect<string, TotpUnavailable>
    readonly digest: (value: string) => Effect.Effect<TokenDigest, TotpUnavailable>
    readonly recoveryDigest: (
      moduleId: string,
      subjectId: string,
      value: string
    ) => Effect.Effect<TokenDigest, TotpUnavailable>
    readonly generateSecret: () => Effect.Effect<Uint8Array, TotpUnavailable>
    readonly matchCode: (
      secret: Uint8Array,
      code: string,
      nowMillis: number,
      skew: number
    ) => Effect.Effect<number | null, TotpUnavailable>
    readonly newRecoveryCodes: (
      moduleId: string,
      subjectId: string
    ) => Effect.Effect<
      { readonly codes: Array<string>; readonly digests: Array<TokenDigest> },
      TotpUnavailable
    >
    readonly encryptSecret: (
      binding: TotpSecretBinding,
      secret: Uint8Array
    ) => Effect.Effect<TotpSecretEnvelope, TotpUnavailable>
    readonly decryptSecret: (
      binding: TotpSecretBinding,
      envelope: TotpSecretEnvelope
    ) => Effect.Effect<Uint8Array, TotpUnavailable>
  }
>()("@effect/auth/TotpCryptography") {
  /** Supply native Mac, Aead, SecureRandom, Digest, and application-owned TotpSecretKeys. */
  static readonly layer = Layer.effect(this, make)
}
