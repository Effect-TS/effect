import { authenticate, negotiate, responseKey } from "#tds/tdsNtlm"
import { describe, expect, it } from "@effect/vitest"
import { Buffer } from "node:buffer"

const challenge = (
  target = Buffer.from("02000c0044006f006d00610069006e0001000c0053006500720076006500720000000000", "hex")
) => {
  const header = Buffer.alloc(56)
  header.write("NTLMSSP\0", "ascii")
  header.writeUInt32LE(2, 8)
  header.writeUInt32LE(0xe28a8233, 20)
  Buffer.from("0123456789abcdef", "hex").copy(header, 24)
  header.writeUInt16LE(target.length, 40)
  header.writeUInt16LE(target.length, 42)
  header.writeUInt32LE(56, 44)
  return Buffer.concat([header, target])
}

const credentials = { username: "User", domain: "Domain", password: "Password" }

describe("NTLMv2", () => {
  it("matches Microsoft's response-key and challenge-response examples", () => {
    // MS-NLMP 4.2.4.2.1 and 4.2.4.2.2.
    expect(responseKey("User", "Domain", "Password").toString("hex")).toBe("0c868a403bfd7a93a3001ef22ef02e3f")
    const response = authenticate(challenge(), credentials, {
      nonce: Buffer.alloc(8, 0xaa),
      timestamp: Buffer.alloc(8)
    })
    const lmOffset = response.readUInt32LE(16)
    const ntOffset = response.readUInt32LE(24)
    expect(response.subarray(lmOffset, lmOffset + 24).toString("hex")).toBe(
      "86c35097ac9cec102554764a57cccc19aaaaaaaaaaaaaaaa"
    )
    expect(response.subarray(ntOffset, ntOffset + 16).toString("hex")).toBe("68cd0ab851e51c96aabc927bebef6a1c")
    expect(response.readUInt16LE(20)).toBeGreaterThan(16)
  })

  it("uses the server timestamp and includes a MIC when supplied", () => {
    const target = Buffer.from("07000800000000000000000000000000", "hex")
    const response = authenticate(challenge(target), credentials, { nonce: Buffer.alloc(8, 0xaa) })
    const lmOffset = response.readUInt32LE(16)
    expect(response.subarray(lmOffset, lmOffset + 24)).toEqual(Buffer.alloc(24))
    expect(response.subarray(72, 88).equals(Buffer.alloc(16))).toBe(false)
  })

  it("rejects malformed challenges and target information", () => {
    expect(() => authenticate(Buffer.alloc(0), credentials)).toThrow("Invalid NTLM challenge")
    const invalid = challenge()
    invalid.writeUInt32LE(0xffffffff, 44)
    expect(() => authenticate(invalid, credentials)).toThrow("security buffer")
    expect(() => authenticate(challenge(Buffer.from([1, 0, 255, 255])), credentials)).toThrow("target info")
    const legacy = challenge()
    legacy.writeUInt32LE(1, 20)
    expect(() => authenticate(legacy, credentials)).toThrow("NTLMv2")
  })

  it("writes a versioned Unicode NTLM negotiate message without signing or key exchange", () => {
    const message = negotiate()
    expect(message.toString("ascii", 0, 8)).toBe("NTLMSSP\0")
    expect(message.readUInt32LE(8)).toBe(1)
    expect(message.readUInt32LE(12) & 0x40000030).toBe(0)
  })
})
