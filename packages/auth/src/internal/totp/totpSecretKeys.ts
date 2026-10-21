import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { TotpUnavailable } from "./errors.ts"

/** Consumer-owned AES-256 keys. Retain old key IDs until stored envelopes are replaced. */
export class TotpSecretKeys extends Context.Service<
  TotpSecretKeys,
  {
    readonly current: Effect.Effect<
      { readonly keyId: string; readonly key: Redacted.Redacted<Uint8Array> },
      TotpUnavailable
    >
    readonly get: (keyId: string) => Effect.Effect<Redacted.Redacted<Uint8Array>, TotpUnavailable>
  }
>()("@effect/auth/TotpSecretKeys") {}
