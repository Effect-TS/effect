import { describe, expect, it } from "@effect/vitest"
import * as Schema from "effect/Schema"
import { looksLikeFilename, looksLikeFlag, TitleInput, TitleWord } from "../src/Validate.js"

describe("looksLikeFilename", () => {
  it("returns true for file.md", () => {
    expect(looksLikeFilename("file.md")).toBe(true)
  })

  it("returns true for test.txt", () => {
    expect(looksLikeFilename("test.txt")).toBe(true)
  })

  it("returns true for config.json", () => {
    expect(looksLikeFilename("config.json")).toBe(true)
  })

  it("returns false for words with spaces and dots", () => {
    expect(looksLikeFilename("foo bar.md")).toBe(false)
  })

  it("returns false for plain word", () => {
    expect(looksLikeFilename("hello")).toBe(false)
  })

  it("returns false for hyphenated words", () => {
    expect(looksLikeFilename("my-title")).toBe(false)
  })

  it("returns false for words without extension", () => {
    expect(looksLikeFilename("README")).toBe(false)
  })
})

describe("looksLikeFlag", () => {
  it("returns true for --help", () => {
    expect(looksLikeFlag("--help")).toBe(true)
  })

  it("returns true for -v", () => {
    expect(looksLikeFlag("-v")).toBe(true)
  })

  it("returns true for --key=value", () => {
    expect(looksLikeFlag("--key=value")).toBe(true)
  })

  it("returns true for key=value (contains equals)", () => {
    expect(looksLikeFlag("key=value")).toBe(true)
  })

  it("returns false for hello", () => {
    expect(looksLikeFlag("hello")).toBe(false)
  })

  it("returns false for my-title", () => {
    expect(looksLikeFlag("my-title")).toBe(false)
  })

  it("returns false for hyphenated-word", () => {
    expect(looksLikeFlag("hyphenated-word")).toBe(false)
  })
})

describe("TitleWord schema", () => {
  it("accepts plain words", () => {
    const result = Schema.decodeUnknownSync(TitleWord)("hello")
    expect(result).toBe("hello")
  })

  it("accepts hyphenated words", () => {
    const result = Schema.decodeUnknownSync(TitleWord)("my-title")
    expect(result).toBe("my-title")
  })

  it("rejects flag-like strings", () => {
    expect(() => Schema.decodeUnknownSync(TitleWord)("--help")).toThrow()
  })

  it("rejects filename-like strings", () => {
    expect(() => Schema.decodeUnknownSync(TitleWord)("file.md")).toThrow()
  })
})

describe("TitleInput schema", () => {
  it("transforms word array to TitleInput", () => {
    const result = Schema.decodeUnknownSync(TitleInput)(["hello", "world"])
    expect(result.words).toEqual(["hello", "world"])
    expect(result.title).toBe("hello world")
    expect(result.slug).toBe("hello-world")
  })

  it("handles single word", () => {
    const result = Schema.decodeUnknownSync(TitleInput)(["hello"])
    expect(result.words).toEqual(["hello"])
    expect(result.title).toBe("hello")
    expect(result.slug).toBe("hello")
  })

  it("handles special characters in words", () => {
    const result = Schema.decodeUnknownSync(TitleInput)(["Hello!", "World?"])
    expect(result.slug).toBe("hello-world")
  })

  it("handles numbers in words", () => {
    const result = Schema.decodeUnknownSync(TitleInput)(["chapter", "1"])
    expect(result.title).toBe("chapter 1")
    expect(result.slug).toBe("chapter-1")
  })

  it("rejects flag-like words", () => {
    expect(() => Schema.decodeUnknownSync(TitleInput)(["--help"])).toThrow()
  })

  it("rejects filename-like words", () => {
    expect(() => Schema.decodeUnknownSync(TitleInput)(["file.md"])).toThrow()
  })
})
