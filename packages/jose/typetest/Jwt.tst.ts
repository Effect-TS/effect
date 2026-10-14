import { Jwe, type Jwk, type Jwks, Jws, Jwt } from "@effect/jose"
import { Context, type Crypto, Effect, Redacted, Schema, SchemaGetter } from "effect"
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

    expect<Effect.Services<typeof signed>>().type.toBe<Encode>()
    expect<Effect.Services<typeof verified>>().type.toBe<Decode>()
    expect<Effect.Success<typeof signed>>().type.toBe<Redacted.Redacted<string>>()
    expect<Effect.Success<typeof verified>>().type.toBe<Jwt.Verified<typeof Claims.Type>>()
    expect<Effect.Error<typeof signed>>().type.toBe<Jwt.JwtError>()
    expect<Effect.Error<typeof verified>>().type.toBe<Jwt.JwtError>()
  })

  it("retains the key-set service and verified key", () => {
    const verified = Jwt.verifyWithKeySet(Claims, token, { algorithms: ["ES256"] })
    expect<Effect.Services<typeof verified>>().type.toBe<Decode | Jwks.Jwks>()
    expect<Effect.Success<typeof verified>>().type.toBe<
      Jwt.Verified<typeof Claims.Type> & { readonly key: Jwk.PublicKey }
    >()
  })

  it("requires Effect Crypto for encryption and no crypto layer for signing", () => {
    const encrypted = Jwe.encrypt(Redacted.make(new Uint8Array()), key, { alg: "dir", enc: "A256GCM" })
    const signed = Jws.sign(Redacted.make(new Uint8Array()), key, { alg: "HS256" })
    expect<Effect.Services<typeof encrypted>>().type.toBe<Crypto.Crypto>()
    expect<Effect.Services<typeof signed>>().type.toBe<never>()
    expect<Jws.Requirements>().type.toBe<never>()
  })
})
