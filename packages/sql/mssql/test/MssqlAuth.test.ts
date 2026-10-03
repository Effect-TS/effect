import { MssqlAuth } from "@effect/sql-mssql"
import { md4 } from "@effect/sql-mssql/internal/md4"
import { describe, expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
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

/** A time whose FILETIME is zero, as in the MS-NLMP examples. */
const filetimeEpoch = -11644473600000

const authenticate = (data: Uint8Array, clientNonce: Uint8Array = new Uint8Array(8).fill(0xaa)) => {
  const result = MssqlAuth.ntlmAuthenticate({ challenge: data, credentials, clientNonce, time: filetimeEpoch })
  if (Result.isFailure(result)) throw result.failure
  return Buffer.from(result.success)
}

describe("NTLMv2", () => {
  it("matches Microsoft's response-key and challenge-response examples", () => {
    // MS-NLMP 4.2.4.2.1 and 4.2.4.2.2.
    expect(Buffer.from(MssqlAuth.ntlmResponseKey("User", "Domain", "Password")).toString("hex")).toBe(
      "0c868a403bfd7a93a3001ef22ef02e3f"
    )
    const response = authenticate(challenge())
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
    const response = authenticate(challenge(target))
    const lmOffset = response.readUInt32LE(16)
    expect(response.subarray(lmOffset, lmOffset + 24)).toEqual(Buffer.alloc(24))
    expect(response.subarray(72, 88).equals(Buffer.alloc(16))).toBe(false)
  })

  it("rejects malformed challenges, target information, and client challenges", () => {
    expect(() => authenticate(Buffer.alloc(0))).toThrow("Invalid NTLM challenge")
    const invalid = challenge()
    invalid.writeUInt32LE(0xffffffff, 44)
    expect(() => authenticate(invalid)).toThrow("security buffer")
    expect(() => authenticate(challenge(Buffer.from([1, 0, 255, 255])))).toThrow("target info")
    const legacy = challenge()
    legacy.writeUInt32LE(1, 20)
    expect(() => authenticate(legacy)).toThrow("NTLMv2")
    expect(() => authenticate(challenge(), new Uint8Array(7))).toThrow("client challenge")
    const error = MssqlAuth.ntlmAuthenticate({
      challenge: new Uint8Array(0),
      credentials,
      clientNonce: new Uint8Array(8),
      time: 0
    })
    expect(Result.isFailure(error) && error.failure._tag).toBe("MssqlAuthError")
  })

  it("writes a versioned Unicode NTLM negotiate message without signing or key exchange", () => {
    const message = Buffer.from(MssqlAuth.ntlmNegotiate())
    expect(message.toString("ascii", 0, 8)).toBe("NTLMSSP\0")
    expect(message.readUInt32LE(8)).toBe(1)
    expect(message.readUInt32LE(12) & 0x40000030).toBe(0)
  })
})

describe("MD4 for NTLM", () => {
  it("matches every RFC 1320 appendix A.5 test vector", () => {
    for (
      const [input, expected] of [
        ["", "31d6cfe0d16ae931b73c59d7e0c089c0"],
        ["a", "bde52cb31de33e46245e05fbdbd6fb24"],
        ["abc", "a448017aaf21d8525fc10ae87aa6729d"],
        ["message digest", "d9130a8164549fe818874806e1c7014b"],
        ["abcdefghijklmnopqrstuvwxyz", "d79e1c308aa5bbcdeea8ed63df412da9"],
        ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "043f8582f241db351ce627e153e7f0e4"],
        ["1234567890".repeat(8), "e33b4ddc9c38f2199c3e7b164fcc0536"]
      ]
    ) {
      expect(Buffer.from(md4(Buffer.from(input))).toString("hex")).toBe(expected)
    }
  })

  it("matches js-md4 0.3.2 fixtures at padding and block boundaries", () => {
    // Fixtures generated with js-md4.hex(Uint8Array.from({ length },
    // (_, i) => (i * 37 + 11) & 255)), before removing the dependency.
    for (
      const [length, expected] of [
        [55, "6cca0c744e9bc4fa913169558377fbba"],
        [56, "d922db7b12a3e5c5b2ba42888e683018"],
        [57, "b0ab24b68ca2884a4ceab0263ff90623"],
        [63, "3b957b68471313efde691f4a3b052567"],
        [64, "9f0d5ce97f5342937c8971e6da28dd46"],
        [65, "552a1758bfae36468d7bdde13f589620"],
        [119, "da03f1576623c8df9ff9a2a34f178c64"],
        [120, "ba9a90900afde8b28a962aae2bcab45e"],
        [127, "e2c83376d692bfa76853538d2879793a"],
        [128, "30d7ef884bca324048651888e3d5fc58"],
        [129, "e2f18e525c38ac135599c664c74967d5"],
        [4096, "9bbae73a16def4771c364b2db08d1bb6"]
      ] as const
    ) {
      const input = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 255)
      const original = input.slice()
      expect(Buffer.from(md4(input)).toString("hex")).toBe(expected)
      expect(input).toEqual(original)
      const storage = new Uint8Array(length + 7).fill(0xff)
      storage.set(input, 3)
      expect(Buffer.from(md4(storage.subarray(3, 3 + length))).toString("hex")).toBe(expected)
    }
  })

  it("produces the NT password hash from UTF-16LE bytes", () => {
    expect(Buffer.from(md4(Buffer.from("Password", "utf16le"))).toString("hex"))
      .toBe("a4f49c406510bdcab6824ee7c30fd852")
  })
})
