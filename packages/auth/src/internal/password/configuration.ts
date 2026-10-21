import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { PasswordConfigurationError } from "./errors.ts"

export const PasswordHashingConfig = Schema.Struct({
  /** Select native scrypt for new hashes; omitted keeps Argon2id. */
  scrypt: Schema.optionalKey(
    Schema.Struct({
      cost: Schema.Literals([8192, 16384, 32768]),
      blockSize: Schema.Literal(8),
      parallelism: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 }))
    })
  ),
  memoryKiB: Schema.Int.check(Schema.isBetween({ minimum: 19456, maximum: 65536 })),
  passes: Schema.Int.check(Schema.isBetween({ minimum: 2, maximum: 6 })),
  parallelism: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 })),
  maximumMemoryKiB: Schema.Int.check(Schema.isBetween({ minimum: 19456, maximum: 65536 })),
  maximumPasses: Schema.Int.check(Schema.isBetween({ minimum: 2, maximum: 6 })),
  maximumParallelism: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 })),
  maximumMemoryPasses: Schema.Int.check(Schema.isBetween({ minimum: 38912, maximum: 393216 })),
  maximumLegacyIterations: Schema.Int.check(
    Schema.isBetween({ minimum: 600000, maximum: 2000000 })
  ),
  maximumPasswordBytes: Schema.Int.check(Schema.isBetween({ minimum: 256, maximum: 65536 }))
})

export type PasswordHashingConfig = typeof PasswordHashingConfig.Type

/** OWASP Argon2id minimum profile. Host CPU/memory allowances must fit this cost;
 * runtime failures never cause an automatic downgrade. Limits are per permit.
 */
export const defaultPasswordHashingConfig: PasswordHashingConfig = Object.freeze({
  memoryKiB: 19456,
  passes: 2,
  parallelism: 1,
  maximumMemoryKiB: 65536,
  maximumPasses: 6,
  maximumParallelism: 4,
  maximumMemoryPasses: 131072,
  maximumLegacyIterations: 1000000,
  maximumPasswordBytes: 16384
})

/** OWASP's 16 MiB scrypt profile. Requires a native scrypt KDF backend.
 * Existing Argon2id/PBKDF2 hashes are rehashed on successful sign-in.
 */
export const defaultScryptPasswordHashingConfig: PasswordHashingConfig = Object.freeze({
  ...defaultPasswordHashingConfig,
  scrypt: Object.freeze({ cost: 16384, blockSize: 8, parallelism: 5 })
})

export const validatePasswordHashingConfig = Effect.fnUntraced(function*(
  input: PasswordHashingConfig
) {
  const config = yield* Schema.decodeEffect(PasswordHashingConfig)(input).pipe(
    Effect.mapError(() => PasswordConfigurationError.make({ component: "hashing" }))
  )

  if (
    config.memoryKiB > config.maximumMemoryKiB ||
    config.passes > config.maximumPasses ||
    config.parallelism > config.maximumParallelism ||
    config.memoryKiB * config.passes > config.maximumMemoryPasses
  ) {
    return yield* PasswordConfigurationError.make({ component: "hashing" })
  }

  if (config.scrypt !== undefined) {
    const { cost, blockSize, parallelism } = config.scrypt
    const minimumParallelism = cost === 8192 ? 10 : cost === 16384 ? 5 : 3

    if (
      parallelism < minimumParallelism ||
      128 * blockSize * (cost + parallelism + 2) > config.maximumMemoryKiB * 1024 ||
      (cost * blockSize * parallelism) / 8 > config.maximumMemoryPasses
    ) {
      return yield* PasswordConfigurationError.make({ component: "hashing" })
    }

    Object.freeze(config.scrypt)
  }

  return Object.freeze(config)
})
