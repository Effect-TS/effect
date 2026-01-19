import _generate from "@babel/generator"
import { parse } from "@babel/parser"
import _traverse from "@babel/traverse"
import { describe, expect, it } from "vitest"
import { createSourceTraceVisitor } from "../src/transformers/sourceTrace.js"
import { createWithSpanTraceVisitor } from "../src/transformers/withSpanTrace.js"
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

function transformWithSpan(code: string, filename: string): string {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript"]
  })

  const state = {
    filename,
    hoisting: createHoistingState()
  }

  traverse(ast, createWithSpanTraceVisitor(filename), undefined, state)

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

describe("withSpanTraceTransformer", () => {
  it("injects source attributes into withSpan (data-last)", () => {
    const input = `Effect.withSpan("myOperation")`

    const output = transformWithSpan(input, "test.ts")

    // Should have attributes with source location
    expect(output).toContain("code.filepath")
    expect(output).toContain("\"test.ts\"")
    expect(output).toContain("code.lineno")
    expect(output).toContain("code.column")
  })

  it("injects source attributes into withSpan (data-first)", () => {
    const input = `Effect.withSpan(effect, "myOperation")`

    const output = transformWithSpan(input, "test.ts")

    // Should have attributes with source location
    expect(output).toContain("code.filepath")
    expect(output).toContain("\"test.ts\"")
  })

  it("merges with existing options object", () => {
    const input = `Effect.withSpan("myOperation", { root: true })`

    const output = transformWithSpan(input, "test.ts")

    // Should preserve existing option
    expect(output).toContain("root: true")
    // Should have source attributes
    expect(output).toContain("code.filepath")
  })

  it("merges with existing attributes", () => {
    const input = `Effect.withSpan("myOperation", { attributes: { custom: "value" } })`

    const output = transformWithSpan(input, "test.ts")

    // Should preserve existing attribute via spread
    expect(output).toContain("custom")
    // Should have source attributes
    expect(output).toContain("code.filepath")
  })

  it("handles member expression withSpan calls", () => {
    const input = `effect.pipe(Effect.withSpan("myOperation"))`

    const output = transformWithSpan(input, "test.ts")

    // Should inject attributes
    expect(output).toContain("code.filepath")
  })

  it("does not transform non-withSpan calls", () => {
    const input = `Effect.succeed(42)`

    const output = transformWithSpan(input, "test.ts")

    // Should not add attributes
    expect(output).not.toContain("code.filepath")
    // Original code should be preserved
    expect(output).toContain("Effect.succeed(42)")
  })

  it("preserves line numbers in attributes", () => {
    const input = `
const x = 1
Effect.withSpan("myOperation")
`.trim()

    const output = transformWithSpan(input, "test.ts")

    // Line 2 for the withSpan call
    expect(output).toContain("\"code.lineno\": 2")
  })
})
