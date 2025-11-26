import { describe, expect, it } from "@effect/vitest"
import { makeContent, makeFilename } from "../src/Note.js"

describe("makeFilename", () => {
  it("generates correct filename format", () => {
    const date = new Date("2025-11-26T14:30:56.886Z")
    const filename = makeFilename("this is the title of my note", date)
    expect(filename).toBe("note-2025-11-26-this-is-the-title-of-my-note.md")
  })

  it("handles title with special characters", () => {
    const date = new Date("2025-11-26T14:30:56.886Z")
    const filename = makeFilename("Hello! World?", date)
    expect(filename).toBe("note-2025-11-26-hello-world.md")
  })

  it("handles title with numbers", () => {
    const date = new Date("2025-11-26T14:30:56.886Z")
    const filename = makeFilename("Chapter 1 Introduction", date)
    expect(filename).toBe("note-2025-11-26-chapter-1-introduction.md")
  })
})

describe("makeContent", () => {
  it("generates correct markdown content", () => {
    const timestamp = new Date("2025-11-26T14:30:56.886Z")
    const content = makeContent("this is the title of my note", timestamp)
    expect(content).toBe(
      "# this is the title of my note\n\nCreated: 2025-11-26T14:30:56.886Z\n"
    )
  })

  it("preserves original title case", () => {
    const timestamp = new Date("2025-11-26T14:30:56.886Z")
    const content = makeContent("My Important Note", timestamp)
    expect(content).toBe(
      "# My Important Note\n\nCreated: 2025-11-26T14:30:56.886Z\n"
    )
  })

  it("preserves spaces in title", () => {
    const timestamp = new Date("2025-11-26T14:30:56.886Z")
    const content = makeContent("hello   world", timestamp)
    expect(content).toBe(
      "# hello   world\n\nCreated: 2025-11-26T14:30:56.886Z\n"
    )
  })
})
