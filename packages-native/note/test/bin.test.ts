import { describe, expect, it } from "@effect/vitest"
import { ExistingArgFile, FileAlreadyExists, WriteError } from "../src/bin.js"

describe("NoteError classes", () => {
  describe("ExistingArgFile", () => {
    it("has correct message with word", () => {
      const error = new ExistingArgFile({ word: "test.txt" })
      expect(error.message).toContain("test.txt")
      expect(error.message).toContain("existing file")
    })

    it("has correct tag", () => {
      const error = new ExistingArgFile({ word: "foo" })
      expect(error._tag).toBe("ExistingArgFile")
    })
  })

  describe("FileAlreadyExists", () => {
    it("has correct message with filename", () => {
      const error = new FileAlreadyExists({ filename: "note-2025-11-26-test.md" })
      expect(error.message).toContain("note-2025-11-26-test.md")
      expect(error.message).toContain("already exists")
    })

    it("has correct tag", () => {
      const error = new FileAlreadyExists({ filename: "note.md" })
      expect(error._tag).toBe("FileAlreadyExists")
    })
  })

  describe("WriteError", () => {
    it("has correct message with filename", () => {
      const error = new WriteError({ filename: "note.md", cause: new Error("EACCES") })
      expect(error.message).toContain("note.md")
      expect(error.message).toContain("Failed to write")
    })

    it("has correct tag", () => {
      const error = new WriteError({ filename: "note.md", cause: null })
      expect(error._tag).toBe("WriteError")
    })

    it("preserves cause", () => {
      const cause = new Error("Permission denied")
      const error = new WriteError({ filename: "note.md", cause })
      expect(error.cause).toBe(cause)
    })
  })
})
