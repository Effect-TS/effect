import { Crypto, Effect, type PlatformError } from "effect"
import { describe, expect, it } from "tstyche"

declare const crypto: Crypto.Crypto
declare const format: "hex" | "bytes"

describe("Crypto", () => {
  it("make requires every operation, which makeSubtle provides", () => {
    const randomBytes = (size: number) => new Uint8Array(size)
    const digest = (_algorithm: Crypto.DigestAlgorithm, data: Uint8Array) => Effect.succeed(data)
    expect(Crypto.make).type.toBeCallableWith({ ...Crypto.makeSubtle({} as SubtleCrypto), randomBytes })
    expect(Crypto.make).type.not.toBeCallableWith({ randomBytes, digest })
  })

  it("rejects options that do not match the selected algorithm", () => {
    const key = {} as Crypto.Key
    const data = new Uint8Array()
    expect(Crypto.generateSecretKey).type.not.toBeCallableWith({ name: "AES-GCM", length: 64 })
    expect(Crypto.generateSecretKey).type.not.toBeCallableWith({ name: "Ed25519" })
    expect(Crypto.generateKeyPair).type.not.toBeCallableWith({ name: "ECDH" })
    expect(Crypto.encrypt).type.not.toBeCallableWith({ name: "AES-GCM" }, key, data)
    expect(Crypto.encrypt).type.not.toBeCallableWith({ name: "AES-CTR", counter: data }, key, data)
    expect(Crypto.sign).type.not.toBeCallableWith({ name: "ECDSA" }, key, data)
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
