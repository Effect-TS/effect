import { type Token, TokenParser } from "#tds/tdsToken"
import { describe, expect, it } from "@effect/vitest"
import { Buffer } from "node:buffer"

const done = Buffer.from("fd100000000100000000000000", "hex")
const intColumn = (name: string) =>
  Buffer.concat([
    Buffer.from("00000000000038", "hex"),
    Buffer.from([name.length]),
    Buffer.from(name, "utf16le")
  ])
const metadata = Buffer.concat([Buffer.from([0x81, 2, 0]), intColumn("a"), intColumn("b")])
const row = Buffer.from([0xd1, 42, 0, 0, 0, 255, 255, 255, 255])
const nbcRow = Buffer.from([0xd2, 1, 7, 0, 0, 0])

describe("TDS tokens", () => {
  it("handles every split through metadata, ROW, NBCROW, and DONE", () => {
    const data = Buffer.concat([metadata, row, nbcRow, done])
    for (let i = 0; i <= data.length; i++) {
      const parser = new TokenParser()
      const tokens: Array<Token> = []
      parser.push(data.subarray(0, i), (token) => tokens.push(token))
      parser.push(data.subarray(i), (token) => tokens.push(token))
      parser.end()
      expect(tokens.map((t) => t._tag)).toEqual(["Metadata", "Row", "Row", "Done"])
      expect(tokens[1]).toEqual({ _tag: "Row", values: [42, -1] })
      expect(tokens[2]).toEqual({ _tag: "Row", values: [null, 7] })
      expect(tokens[3]).toEqual({ _tag: "Done", kind: 0xfd, status: 16, rowCount: BigInt(1) })
    }
  })

  it("handles bytewise PLP fragmentation without retaining mutable result buffers", () => {
    const columns = Buffer.from("810100000000000000a5ffff017800", "hex")
    const plp = Buffer.from("d10300000000000000020000000102010000000300000000", "hex")
    const data = Buffer.concat([columns, plp, done])
    const parser = new TokenParser()
    const rows: Array<ReadonlyArray<unknown>> = []
    for (let i = 0; i < data.length; i++) {
      parser.push(data.subarray(i, i + 1), (t) => {
        if (t._tag === "Row") rows.push(t.values)
      })
    }
    parser.end()
    parser.push(Buffer.concat(Array.from({ length: 400 }, () => done)), () => {})
    expect(rows).toEqual([[Buffer.from([1, 2, 3])]])
  })

  it("rejects unexpected tokens, rows without metadata, and truncated messages", () => {
    expect(() => new TokenParser().push(Buffer.from([0]), () => {})).toThrow("Unexpected")
    expect(() => new TokenParser().push(row, () => {})).toThrow("before COLMETADATA")
    const parser = new TokenParser()
    parser.push(done.subarray(0, 10), () => {})
    expect(() => parser.end()).toThrow("Truncated")
  })

  it("rejects malformed length-delimited tokens immediately", () => {
    expect(() => new TokenParser().push(Buffer.from([0xaa, 1, 0, 0]), () => {})).toThrow("Malformed")
  })

  it("enforces a token bound but permits large chunks of small tokens", () => {
    const parser = new TokenParser(32)
    let count = 0
    parser.push(Buffer.concat(Array.from({ length: 1000 }, () => done)), () => count++)
    parser.end()
    expect(count).toBe(1000)
    const invalid = new TokenParser(16)
    expect(() => invalid.push(Buffer.concat([Buffer.from([0xaa, 100, 0]), Buffer.alloc(100)]), () => {})).toThrow(
      "limit"
    )
  })
})
