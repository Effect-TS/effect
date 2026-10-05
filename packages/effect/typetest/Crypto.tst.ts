import { Crypto, Effect } from "effect"
import type { PlatformError } from "effect"
import { describe, expect, it } from "tstyche"

declare const crypto: Crypto.Crypto
declare const format: "hex" | "bytes"

describe("Crypto", () => {
  const implementation = {
    randomBytes: (size: number) => new Uint8Array(size),
    digest: (_algorithm: Crypto.DigestAlgorithm, data: Uint8Array) => Effect.succeed(data),
    hmac: (_algorithm: Crypto.HmacAlgorithm, _key: Uint8Array, data: Uint8Array) => Effect.succeed(data),
    pbkdf2: (
      _algorithm: Crypto.HmacAlgorithm,
      _password: Uint8Array,
      _salt: Uint8Array,
      _iterations: number,
      length: number
    ) => Effect.succeed(new Uint8Array(length)),
    rsaOaepEncrypt: (options: Crypto.RsaOaepOptions) => Effect.succeed(options.data)
  }

  it("requires all cryptographic operations on the service", () => {
    expect<Crypto.Crypto>().type.toBeAssignableTo<
      Required<Pick<Crypto.Crypto, "hmac" | "pbkdf2" | "rsaOaepEncrypt">>
    >()
  })

  it("requires all cryptographic operations in the constructor", () => {
    expect(Crypto.make).type.toBeCallableWith(implementation)
    expect(Crypto.make).type.not.toBeCallableWith({
      randomBytes: implementation.randomBytes,
      digest: implementation.digest,
      pbkdf2: implementation.pbkdf2,
      rsaOaepEncrypt: implementation.rsaOaepEncrypt
    })
    expect(Crypto.make).type.not.toBeCallableWith({
      randomBytes: implementation.randomBytes,
      digest: implementation.digest,
      hmac: implementation.hmac,
      rsaOaepEncrypt: implementation.rsaOaepEncrypt
    })
    expect(Crypto.make).type.not.toBeCallableWith({
      randomBytes: implementation.randomBytes,
      digest: implementation.digest,
      hmac: implementation.hmac,
      pbkdf2: implementation.pbkdf2
    })
    expect(Crypto.make).type.not.toBeCallableWith({ ...implementation, hmac: undefined })
    expect(Crypto.make).type.not.toBeCallableWith({ ...implementation, pbkdf2: undefined })
    expect(Crypto.make).type.not.toBeCallableWith({ ...implementation, rsaOaepEncrypt: undefined })
  })

  it("randomUUIDv4 infers the output from the format, defaulting to string", () => {
    expect(crypto.randomUUIDv4()).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv4({})).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv4({ format: "hex" })).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv4({ format: "bytes" })).type.toBe<Effect.Effect<Uint8Array, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv4({ format })).type.toBe<Effect.Effect<string | Uint8Array, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv4).type.not.toBeCallableWith({ format: "base64" })
  })

  it("randomUUIDv7 infers the output from the format, defaulting to string", () => {
    expect(crypto.randomUUIDv7()).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv7({})).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv7({ format: "hex" })).type.toBe<Effect.Effect<string, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv7({ format: "bytes" })).type.toBe<Effect.Effect<Uint8Array, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv7({ format })).type.toBe<Effect.Effect<string | Uint8Array, PlatformError.PlatformError>>()
    expect(crypto.randomUUIDv7).type.not.toBeCallableWith({ format: "base64" })
  })

  it("randomUUIDv4 only promises bytes when the byte format is required", () => {
    const options: { readonly format?: "bytes" | undefined } = {}
    expect(crypto.randomUUIDv4(options)).type.toBe<Effect.Effect<string | Uint8Array, PlatformError.PlatformError>>()

    expect(crypto.randomUUIDv4<"bytes">).type.toBeCallableWith({ format: "bytes" })
    expect(crypto.randomUUIDv4<"bytes">).type.not.toBeCallableWith()
  })

  it("randomUUIDv7 only promises bytes when the byte format is required", () => {
    const options: { readonly format?: "bytes" | undefined } = {}
    expect(crypto.randomUUIDv7(options)).type.toBe<Effect.Effect<string | Uint8Array, PlatformError.PlatformError>>()

    expect(crypto.randomUUIDv7<"bytes">).type.toBeCallableWith({ format: "bytes" })
    expect(crypto.randomUUIDv7<"bytes">).type.not.toBeCallableWith()
  })
})
