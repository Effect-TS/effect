import { md4 } from "#tds/md4"
import { describe, expect, it } from "@effect/vitest"
import { Buffer } from "node:buffer"

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
