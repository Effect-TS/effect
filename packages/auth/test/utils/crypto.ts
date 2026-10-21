import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { Aead, Digest, Mac, SecureRandom, Signature } from "effect/crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export const cryptoLayer = Layer.mergeAll(
  NodeCrypto.layerAead,
  NodeCrypto.layerDigest,
  NodeCrypto.layerMac,
  NodeCrypto.layerSignature
).pipe(Layer.provideMerge(NodeCrypto.layerSecureRandom))

export const webCryptoLayer = Layer.mergeAll(
  Aead.layerWebCrypto,
  Digest.layerWebCrypto,
  Mac.layerWebCrypto,
  Signature.layerWebCrypto
).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))

export const makeDigest = (digest: Digest.Digest["Service"]["digest"]): Digest.Digest["Service"] => ({
  digest,
  digestHex: () => Effect.die("Unexpected digestHex call")
})

export const withSubtle = (crypto: Crypto, subtle: SubtleCrypto): Crypto =>
  new Proxy(crypto, {
    get(target, name) {
      if (name === "subtle") return subtle
      const value = Reflect.get(target, name, target)
      return typeof value === "function" ? value.bind(target) : value
    }
  })
