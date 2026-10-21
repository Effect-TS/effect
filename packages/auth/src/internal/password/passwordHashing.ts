import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"

import type { PasswordHashingConfig } from "./configuration.ts"
import type {
  PasswordHashingUnavailable,
  PasswordInputInvalid,
  PasswordKdfBusy,
  PasswordVerifierInvalid
} from "./errors.ts"
import { make } from "./hashing.ts"
import type { EncodedPasswordHash, PasswordVerification } from "./models.ts"

type HashFailure = PasswordHashingUnavailable | PasswordInputInvalid | PasswordKdfBusy

/** Byte-preserving KDF capability. Text normalization belongs to trusted credential
 * provenance, never the algorithm identifier. Rehash legacy passwords with mode none.
 * Replacements must retain admission through computation and cleanup. KDF backends
 * own masks around nonabortable native calls until actual completion. Portable KDFs
 * can stop between batches; they are not off-thread workers.
 * Operations read secrets only when run. Erased passwords fail with
 * PasswordHashingUnavailable; erased verifiers fail with PasswordVerifierInvalid.
 * Scoped buffer ownership permits cancellation during interruptible derivation;
 * noncancelable native work must finish before its backend releases ownership.
 */
export class PasswordHashing extends Context.Service<
  PasswordHashing,
  {
    readonly hash: (
      password: Redacted.Redacted<string>
    ) => Effect.Effect<Redacted.Redacted<EncodedPasswordHash>, HashFailure>
    readonly verify: (
      password: Redacted.Redacted<string>,
      verifier: Redacted.Redacted<EncodedPasswordHash>
    ) => Effect.Effect<PasswordVerification, HashFailure | PasswordVerifierInvalid>
    /** One current-cost derivation, including on the first unknown-identifier attempt. */
    readonly dummy: (password: Redacted.Redacted<string>) => Effect.Effect<void, HashFailure>
  }
>()("@effect/auth/PasswordHashing") {
  /** Supply native Kdf and SecureRandom services, and share KdfAdmission.layer across password hashers. */
  static readonly layer = (config?: PasswordHashingConfig) => Layer.effect(this, make(config))
}
