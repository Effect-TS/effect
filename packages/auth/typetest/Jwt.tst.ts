import { Jwe, Jwk, type Jwks, Jws, Jwt } from "@effect/auth"
import { Context, Effect, Redacted, Schema, SchemaGetter } from "effect"
import type { Aes, CryptoError, Ecdsa, Ed25519, Hmac, Rsa, SecureRandom } from "effect/crypto"
import { describe, expect, it } from "tstyche"

declare const key: Jwk.SecretKey
declare const token: Redacted.Redacted<string>

class Decode extends Context.Service<Decode, { readonly prefix: string }>()("test/Decode") {}
class Encode extends Context.Service<Encode, { readonly prefix: string }>()("test/Encode") {}

const Claims = Schema.Struct({
  sub: Schema.String.pipe(Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transformEffect((value) => Effect.map(Decode, (service) => service.prefix + value)),
    encode: SchemaGetter.transformEffect((value) => Effect.map(Encode, (service) => value.slice(service.prefix.length)))
  })),
  quota: Schema.FiniteFromString
})

describe("JWT schema inference", () => {
  it("keeps encoding and decoding services distinct", () => {
    const signed = Jwt.sign(Claims, { sub: "user:42", quota: 3 }, key, { alg: "HS256" })
    const verified = Jwt.verify(Claims, token, key, { algorithms: ["HS256"] })

    expect<Effect.Services<typeof signed>>().type.toBe<Encode | Jws.Requirements>()
    expect<Effect.Services<typeof verified>>().type.toBe<Decode | Jws.Requirements>()
    expect<Effect.Success<typeof signed>>().type.toBe<Redacted.Redacted<string>>()
    expect<Effect.Success<typeof verified>>().type.toBe<Jwt.Verified<typeof Claims.Type>>()
    expect<Effect.Error<typeof signed>>().type.toBe<Jwt.JwtError>()
    expect<Effect.Error<typeof verified>>().type.toBe<Jwt.JwtError>()
  })

  it("retains the key-set service and verified key", () => {
    const verified = Jwt.verifyWithKeySet(Claims, token, { algorithms: ["ES256"] })
    expect<Effect.Services<typeof verified>>().type.toBe<Decode | Jwks.Jwks | Rsa.Rsa | Ecdsa.Ecdsa | Ed25519.Ed25519>()
    expect<Effect.Success<typeof verified>>().type.toBe<
      Jwt.Verified<typeof Claims.Type> & { readonly key: Jwk.PublicKey }
    >()
  })

  it("requires the native algorithm services for each operation", () => {
    const encrypted = Jwe.encrypt(Redacted.make(new Uint8Array()), key, { alg: "dir", enc: "A256GCM" })
    const signed = Jws.sign(Redacted.make(new Uint8Array()), key, { alg: "HS256" })
    expect<Effect.Services<typeof encrypted>>().type.toBe<Aes.Aes | SecureRandom.SecureRandom>()
    expect<Effect.Services<typeof signed>>().type.toBe<Jws.Requirements>()
    expect<Jws.Requirements>().type.toBe<Hmac.Hmac | Rsa.Rsa | Ecdsa.Ecdsa | Ed25519.Ed25519>()
    const decrypted = Jwe.decrypt(token, key)
    expect<Effect.Services<typeof decrypted>>().type.toBe<Aes.Aes>()
    const verified = Jws.verifyWithKeySet(token, { algorithms: ["ES256"] })
    expect<Effect.Services<typeof verified>>().type.toBe<Jwks.Jwks | Rsa.Rsa | Ecdsa.Ecdsa | Ed25519.Ed25519>()
  })

  it("keeps key helper environments empty and native causes out of public failures", () => {
    const generated = Jwk.generateKeyPair({ algorithm: "ES256" })
    const imported = Jwk.importPkcs8(Redacted.make(new Uint8Array()), "ES256")
    const verified = Jws.verify(token, key, { algorithms: ["HS256"] })
    const decrypted = Jwe.decrypt(token, key)
    expect<Effect.Services<typeof generated>>().type.toBe<Rsa.Rsa | Ecdsa.Ecdsa | Ed25519.Ed25519>()
    expect<Effect.Services<typeof imported>>().type.toBe<never>()
    expect<Effect.Success<typeof imported>>().type.toBe<Jwk.PrivateKey>()
    expect<Effect.Success<typeof generated>>().type.toBe<Jwk.GeneratedKeyPair>()
    expect<Extract<Effect.Error<typeof generated>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof imported>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof verified>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof decrypted>, CryptoError.CryptoError>>().type.toBe<never>()
  })
})
