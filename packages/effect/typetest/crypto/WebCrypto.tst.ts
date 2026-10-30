/// <reference types="node" />

import * as Mac from "effect/crypto/Mac"
import type * as WebCrypto from "effect/crypto/WebCrypto"
import type { webcrypto } from "node:crypto"
import { describe, expect, it } from "tstyche"

declare const nodeKey: webcrypto.CryptoKey

describe("WebCrypto", () => {
  it("accepts DOM and Node Web Crypto keys", () => {
    expect<WebCrypto.CryptoKey>().type.toBeAssignableFrom<CryptoKey>()
    expect<WebCrypto.CryptoKey>().type.toBeAssignableFrom<webcrypto.CryptoKey>()
    expect(Mac.fromCryptoKey(Mac.hmacSha256, nodeKey)).type.not.toRaiseError()
  })
})
