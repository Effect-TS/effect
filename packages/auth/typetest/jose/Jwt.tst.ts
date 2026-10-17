import type * as Auth from "@effect/auth"
import { Jwe, Jwk, type Jwks, Jws, Jwt } from "@effect/auth/jose"
import { Context, type Duration, Effect, Redacted, Schema, SchemaGetter } from "effect"
import type { Aead, CryptoError, Mac, SecureRandom, Signature } from "effect/crypto"
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

describe("grouped JOSE exports", () => {
  it("preserves all five module types through the root namespace", () => {
    expect<typeof Auth.Jose.Jwe>().type.toBe<typeof Jwe>()
    expect<typeof Auth.Jose.Jwk>().type.toBe<typeof Jwk>()
    expect<typeof Auth.Jose.Jwks>().type.toBe<typeof Jwks>()
    expect<typeof Auth.Jose.Jws>().type.toBe<typeof Jws>()
    expect<typeof Auth.Jose.Jwt>().type.toBe<typeof Jwt>()
  })

  it("exports capabilities through the root namespace", () => {
    expect<keyof typeof Auth>().type.toBe<
      "Jose" | "OAuth"
    >()
    expect<keyof typeof Auth.Jose>().type.toBe<"JoseError" | "Jwe" | "Jwk" | "Jwks" | "Jws" | "Jwt">()
  })
})

describe("JWT schema inference", () => {
  it("accepts Duration inputs without changing the public options schema type", () => {
    expect<Jwt.VerifyOptions>().type.toBe<typeof Jwt.VerifyOptions.Type>()
    expect<Jwt.VerifyOptions["clockTolerance"]>().type.toBe<Duration.Input | undefined>()
    expect<Jwt.VerifyOptions["maxTokenAge"]>().type.toBe<Duration.Input | undefined>()
    expect<Jwks.RemoteOptions["timeToLive"]>().type.toBe<Duration.Input | undefined>()
    expect<Jwks.RemoteOptions["cooldown"]>().type.toBe<Duration.Input | undefined>()
    expect<Jwks.RemoteOptions["timeout"]>().type.toBe<Duration.Input | undefined>()
  })

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
    expect<Effect.Services<typeof verified>>().type.toBe<Decode | Jwks.Jwks | Signature.Signature>()
    expect<Effect.Success<typeof verified>>().type.toBe<
      Jwt.Verified<typeof Claims.Type> & { readonly key: Jwk.PublicKey }
    >()
  })

  it("requires the native algorithm services for each operation", () => {
    const encrypted = Jwe.encrypt(Redacted.make(new Uint8Array()), key, { alg: "dir", enc: "A256GCM" })
    const signed = Jws.sign(Redacted.make(new Uint8Array()), key, { alg: "HS256" })
    expect<Effect.Services<typeof encrypted>>().type.toBe<Aead.Aead | SecureRandom.SecureRandom>()
    expect<Effect.Services<typeof signed>>().type.toBe<Jws.Requirements>()
    expect<Jws.Requirements>().type.toBe<Mac.Mac | Signature.Signature>()
    const decrypted = Jwe.decrypt(token, key)
    expect<Effect.Services<typeof decrypted>>().type.toBe<Aead.Aead>()
    const verified = Jws.verifyWithKeySet(token, { algorithms: ["ES256"] })
    expect<Effect.Services<typeof verified>>().type.toBe<Jwks.Jwks | Signature.Signature>()
  })

  it("keeps key helper environments empty and native causes out of public failures", () => {
    const generated = Jwk.generateKeyPair({ algorithm: "ES256" })
    const imported = Jwk.importPkcs8(Redacted.make(new Uint8Array()), "ES256")
    const verified = Jws.verify(token, key, { algorithms: ["HS256"] })
    const decrypted = Jwe.decrypt(token, key)
    expect<Effect.Services<typeof generated>>().type.toBe<Signature.Signature>()
    expect<Effect.Services<typeof imported>>().type.toBe<never>()
    expect<Effect.Success<typeof imported>>().type.toBe<Jwk.PrivateKey>()
    expect<Effect.Success<typeof generated>>().type.toBe<Jwk.GeneratedKeyPair>()
    expect<Extract<Effect.Error<typeof generated>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof imported>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof verified>, CryptoError.CryptoError>>().type.toBe<never>()
    expect<Extract<Effect.Error<typeof decrypted>, CryptoError.CryptoError>>().type.toBe<never>()
  })
})
