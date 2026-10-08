import type { Crypto, Effect, PlatformError } from "effect"
import { describe, expect, it } from "tstyche"

declare const crypto: Crypto.Crypto
declare const format: "hex" | "bytes"

describe("Crypto", () => {
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
})
