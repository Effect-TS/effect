/** @internal */
import type * as Effect from "../../Effect.ts"
import type * as CryptoError from "../CryptoError.ts"

/** @internal */
export interface Argon2Parameters {
  readonly password: Uint8Array
  readonly salt: Uint8Array
  readonly memoryKiB: number
  readonly passes: number
  readonly parallelism: number
  readonly length: number
  readonly secret?: Uint8Array | undefined
  readonly associatedData: Uint8Array
}

/** @internal */
export type Argon2 = (input: Argon2Parameters) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
