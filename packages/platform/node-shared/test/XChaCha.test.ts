import { hchacha20 } from "@effect/platform-node-shared/internal/xchacha"
import { assert, it } from "@effect/vitest"

it("matches the published HChaCha20 nonce-extension vector", () => {
  // draft-irtf-cfrg-xchacha-03, section 2.2.1.
  const key = Uint8Array.from({ length: 32 }, (_, i) => i)
  const nonce = Uint8Array.from(Buffer.from("000000090000004a0000000031415927", "hex"))
  const expected = Uint8Array.from(
    Buffer.from("82413b4227b27bfed30e42508a877d73a0f9e4d58a74a853c12ec41326d3ecdc", "hex")
  )
  assert.deepStrictEqual(hchacha20(key, nonce), expected)
  assert.deepStrictEqual(key, Uint8Array.from({ length: 32 }, (_, i) => i))
  assert.strictEqual(Buffer.from(nonce).toString("hex"), "000000090000004a0000000031415927")
})
