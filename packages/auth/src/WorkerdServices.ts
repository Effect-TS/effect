/**
 * Auth runtime services with Wasm Argon2id and native scrypt for Cloudflare Workers.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import argon2Module from "effect/crypto/argon2.wasm"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { defaultPasswordHashingConfig, type PasswordHashingConfig } from "./internal/password/configuration.ts"
import type { PasswordConfigurationError } from "./internal/password/errors.ts"
import { PasswordHashing } from "./internal/password/passwordHashing.ts"
import * as WorkerdPasswordlessServices from "./WorkerdPasswordlessServices.ts"

/**
 * Runtime services for Auth on Cloudflare Workers. Storage, keys, account
 * policy, delivery, and protocol adapters remain application-owned.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type WorkerdServices =
  | WorkerdPasswordlessServices.WorkerdPasswordlessServices
  | Kdf.Kdf
  | KdfAdmission.KdfAdmission
  | PasswordHashing

/**
 * Password policy, per-derivation resource limits, and shared admission capacity.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options {
  readonly passwordHashing?: PasswordHashingConfig
  readonly kdfLimits?: Partial<Kdf.Limits>
  readonly kdfAdmission?: KdfAdmission.Options
}

/**
 * Configures password hashing, derivation limits, and shared admission for
 * direct KDF calls and password preparation, derivation, and cleanup. Resource
 * limits default to the password policy; `kdfLimits` can impose tighter ceilings.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerWith = (
  options: Options
): Layer.Layer<WorkerdServices, CryptoError.CryptoError | PasswordConfigurationError> => {
  const password = options.passwordHashing ?? defaultPasswordHashingConfig
  const limits: Kdf.Limits = {
    ...Kdf.defaultLimits,
    maximumMemoryKiB: password.maximumMemoryKiB,
    maximumPasses: password.maximumPasses,
    maximumParallelism: password.maximumParallelism,
    maximumMemoryPasses: password.maximumMemoryPasses,
    maximumIterations: password.maximumLegacyIterations,
    maximumInputBytes: password.maximumPasswordBytes,
    ...options.kdfLimits
  }
  const kdf = Layer.effect(
    Kdf.Kdf,
    Effect.gen(function*() {
      if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
        return yield* new CryptoError.CryptoError({
          module: "Kdf",
          method: "layer",
          reason: new CryptoError.InvalidArgument({
            description: "KDF resource ceilings must be positive safe integers"
          })
        })
      }
      const kdf = Kdf.withLimits(yield* Kdf.Kdf, limits)
      const admission = yield* KdfAdmission.KdfAdmission
      return Kdf.Kdf.of({
        derive: (algorithm, secret, options) =>
          admission.run(kdf.derive(algorithm, secret, options)).pipe(
            Effect.catchTag("KdfBusy", () =>
              Effect.fail(
                new CryptoError.CryptoError({
                  module: "Kdf",
                  method: "derive",
                  reason: new CryptoError.Busy()
                })
              ))
          )
      })
    })
  ).pipe(Layer.provide(Kdf.layerWasm(argon2Module, NodeCrypto.layerKdf)))

  const platform = Layer.merge(
    WorkerdPasswordlessServices.layer,
    kdf.pipe(Layer.provideMerge(KdfAdmission.layer(options.kdfAdmission)))
  )

  return PasswordHashing.layer(options.passwordHashing).pipe(Layer.provideMerge(platform))
}

/**
 * Provides crypto, Argon2id and scrypt password hashing, bounded KDF admission,
 * and a Fetch HTTP client. Bundle this entrypoint with Wrangler and enable
 * `nodejs_compat`. It is kept separate from the browser-safe package root.
 *
 * **Gotchas**
 *
 * Admission is shared within the built Layer's lifetime. To bound concurrent
 * requests in an isolate, retain the built services at that lifetime and supply
 * them to request-scoped auth and database Layers. Rebuilding per request creates
 * independent admission services. Admission does not implement distributed rate limiting.
 *
 * @see {@link WorkerdPasswordlessServices.layer} for applications without password hashing
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer: Layer.Layer<WorkerdServices, CryptoError.CryptoError | PasswordConfigurationError> = layerWith({})
