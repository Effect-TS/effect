import { describe, expect, it } from "@effect/vitest"
import * as Schema from "effect/Schema"
import { Slug, SlugBranded, slugify } from "../src/Slug.js"

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("replaces spaces with hyphens", () => {
    expect(slugify("this is a test")).toBe("this-is-a-test")
  })

  it("removes special characters", () => {
    expect(slugify("Hello! World?")).toBe("hello-world")
  })

  it("collapses multiple spaces into single hyphen", () => {
    expect(slugify("hello   world")).toBe("hello-world")
  })

  it("collapses multiple hyphens into single hyphen", () => {
    expect(slugify("hello---world")).toBe("hello-world")
  })

  it("trims leading hyphens", () => {
    expect(slugify("  hello world")).toBe("hello-world")
  })

  it("trims trailing hyphens", () => {
    expect(slugify("hello world  ")).toBe("hello-world")
  })

  it("handles mixed case and special chars", () => {
    expect(slugify("This is My Title!")).toBe("this-is-my-title")
  })

  it("handles numbers", () => {
    expect(slugify("Chapter 1 Introduction")).toBe("chapter-1-introduction")
  })

  it("handles empty string", () => {
    expect(slugify("")).toBe("")
  })

  it("handles string with only special characters", () => {
    expect(slugify("!@#$%")).toBe("")
  })

  it("handles the example from requirements", () => {
    expect(slugify("this is the title of my note")).toBe("this-is-the-title-of-my-note")
  })
})

describe("Slug schema", () => {
  it("transforms input to slug", () => {
    const result = Schema.decodeUnknownSync(Slug)("Hello World")
    expect(result).toBe("hello-world")
  })

  it("encodes slug as-is", () => {
    const result = Schema.encodeSync(Slug)("hello-world")
    expect(result).toBe("hello-world")
  })
})

describe("SlugBranded schema", () => {
  it("transforms input to branded slug", () => {
    const result = Schema.decodeUnknownSync(SlugBranded)("Hello World")
    expect(result).toBe("hello-world")
  })

  it("encodes branded slug as-is", () => {
    const result = Schema.encodeSync(SlugBranded)("hello-world" as any)
    expect(result).toBe("hello-world")
  })
})
