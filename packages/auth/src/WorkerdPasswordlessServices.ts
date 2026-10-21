/**
 * Runtime services for passwordless Auth applications on Cloudflare Workers.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Aead from "effect/crypto/Aead"
import type * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Signature from "effect/crypto/Signature"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import { layerCryptoWeb } from "./WebCrypto.ts"

/**
 * Services used by OAuth, sessions, passkeys, and proofs on Cloudflare Workers.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type WorkerdPasswordlessServices =
  | SecureRandom.SecureRandom
  | Digest.Digest
  | Aead.Aead
  | Mac.Mac
  | Signature.Signature
  | HttpClient.HttpClient

/**
 * Supplies randomness, digests, XChaCha-capable encryption, MACs, signatures, and
 * a Fetch HTTP client. It imports no Wasm or Node built-ins and needs no
 * `nodejs_compat` flag. Storage, keys, policy, delivery, and protocol adapters
 * remain application-owned.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer: Layer.Layer<WorkerdPasswordlessServices> = Layer.mergeAll(
  Aead.layerWebCrypto,
  Mac.layerWebCrypto,
  Signature.layerWebCrypto,
  FetchHttpClient.layer
).pipe(Layer.provideMerge(layerCryptoWeb))
