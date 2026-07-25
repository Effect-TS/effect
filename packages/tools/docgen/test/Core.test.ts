import * as SemanticModel from "@effect/docgen/SemanticModel"
import { assert, describe, it } from "@effect/vitest"

const assertFencedCode = (
  markdown: string,
  expectedExamples: ReadonlyArray<string>,
  expectedWarnings: ReadonlyArray<string>
) => {
  assert.deepStrictEqual(SemanticModel.extractFencedCode(markdown), [expectedExamples, expectedWarnings])
}

describe("SemanticModel", () => {
  describe("[internal] extractFencedCode", () => {
    it("should extract fenced code blocks from markdown (backticks)", () => {
      assertFencedCode("a\n\n```ts\nconst a = 1\n```\n\nb", ["const a = 1"], [])
    })

    it("should extract fenced code blocks from markdown (tildes)", () => {
      assertFencedCode("a\n\n~~~ts\nconst a = 1\n~~~~\n\nb", ["const a = 1"], [])
    })

    it("should skip-type-checking (backticks)", () => {
      assertFencedCode("a\n\n```ts skip-type-checking a=1\nconst a = 1\n```\n\nb", [], [])
    })

    it("should skip-type-checking (tildes)", () => {
      assertFencedCode("a\n\n~~~ts skip-type-checking a=1\nconst a = 1\n~~~~\n\nb", [], [])
    })

    it("should handle metadata (backticks)", () => {
      assertFencedCode("a\n\n```ts a=1\nconst a = 1\n```\n\nb", ["const a = 1"], [])
    })

    it("should handle metadata (tildes)", () => {
      assertFencedCode("a\n\n~~~ts a=1\nconst a = 1\n~~~~\n\nb", ["const a = 1"], [])
    })

    it("should handle non closing fences (backticks)", () => {
      assertFencedCode("a\n\n```ts\nconst a = 1", ["const a = 1"], [
        "Code block does not have a matching closing fence:\na\n\n```ts\nconst a = 1"
      ])
    })

    it("should handle non closing fences (tildes)", () => {
      assertFencedCode("a\n\n~~~ts\nconst a = 1", ["const a = 1"], [
        "Code block does not have a matching closing fence:\na\n\n~~~ts\nconst a = 1"
      ])
    })
  })
})
