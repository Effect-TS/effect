import _generate from "@babel/generator"
import { parse } from "@babel/parser"
import _traverse from "@babel/traverse"
import { describe, expect, it } from "vitest"
import { createSourceTraceVisitor } from "../src/transformers/sourceTrace.js"
import { createHoistingState } from "../src/utils/hoisting.js"

// Handle both ESM and CJS module exports
const traverse = typeof _traverse === "function" ? _traverse : (_traverse as any).default
const generate = typeof _generate === "function" ? _generate : (_generate as any).default

function transform(code: string, filename: string): string {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript"]
  })

  const state = {
    filename,
    hoisting: createHoistingState()
  }

  traverse(ast, createSourceTraceVisitor(filename), undefined, state)

  return generate(ast).code
}

describe("sourceTraceTransformer", () => {
  it("injects trace into adapter calls", () => {
    const input = `
Effect.gen(function* (_) {
  const user = yield* _(getUserById(id))
  return user
})
`.trim()

    const output = transform(input, "test.ts")

    // Should have a hoisted trace constant
    expect(output).toContain("const _trace0")
    // Should have the filename in the trace
    expect(output).toContain("\"test.ts\"")
    // Should inject the trace as second argument
    expect(output).toContain("_(getUserById(id), _trace0)")
  })

  it("extracts label from variable declaration", () => {
    const input = `
Effect.gen(function* (_) {
  const fetchedUser = yield* _(getUser())
  return fetchedUser
})
`.trim()

    const output = transform(input, "test.ts")

    // Should extract "fetchedUser" as label
    expect(output).toContain("\"fetchedUser\"")
  })

  it("handles multiple yields on different lines", () => {
    const input = `
Effect.gen(function* (_) {
  const a = yield* _(effectA)
  const b = yield* _(effectB)
  return a + b
})
`.trim()

    const output = transform(input, "test.ts")

    // Should have two distinct traces
    expect(output).toContain("_trace0")
    expect(output).toContain("_trace1")
    // Each yield should have its trace
    expect(output).toContain("_(effectA, _trace0)")
    expect(output).toContain("_(effectB, _trace1)")
  })

  it("handles multiple yields on same line with different columns", () => {
    const input = `Effect.gen(function* (_) { yield* _(a); yield* _(b) })`

    const output = transform(input, "test.ts")

    // Should have two distinct traces due to different columns
    expect(output).toContain("_trace0")
    expect(output).toContain("_trace1")
  })

  it("does not transform non-adapter yields", () => {
    const input = `
function* myGenerator() {
  yield* someIterator
}
`.trim()

    const output = transform(input, "test.ts")

    // Should not add any trace constants
    expect(output).not.toContain("_trace")
    // Original code should be preserved
    expect(output).toContain("yield* someIterator")
  })

  it("does not transform yield (non-delegating)", () => {
    const input = `
function* myGenerator(_) {
  yield _(effect)
}
`.trim()

    const output = transform(input, "test.ts")

    // Should not add any trace constants (yield without *)
    expect(output).not.toContain("_trace")
  })

  it("includes SourceLocation type tag", () => {
    const input = `
Effect.gen(function* (_) {
  yield* _(effect)
})
`.trim()

    const output = transform(input, "test.ts")

    // Should include the type tag
    expect(output).toContain("Symbol.for(\"effect/SourceLocation\")")
  })

  it("preserves line and column numbers", () => {
    const input = `Effect.gen(function* (_) {
  const x = yield* _(effect)
})`

    const output = transform(input, "src/services/UserRepo.ts")

    // Check the filename is used
    expect(output).toContain("\"src/services/UserRepo.ts\"")
    // Line 2 (1-indexed)
    expect(output).toContain("line: 2")
  })
})
