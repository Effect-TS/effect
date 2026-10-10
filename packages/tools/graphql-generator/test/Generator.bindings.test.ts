/**
 * Regressions from the stage-4 review: generated modules must load. Each case
 * is valid GraphQL that produced code which failed to parse or threw at
 * import time.
 *
 * - Imports between generated files must not form a cycle. Every fragment
 *   reference is read while a module initializes, so any cycle throws for
 *   some entry point. A cycle is reported as one located error, at the first
 *   cross-file spread on the cycle (file order, then position), and nothing
 *   is emitted. Users own the document files and can move fragments to break
 *   it.
 * - A module that exports a group can't also bind a fragment of that name,
 *   whether the fragment is local or imported.
 * - Schema type names are not the user's to choose, so names that clash with
 *   the shared module's own bindings or are reserved words must still emit
 *   working code.
 * - A `__proto__` response key or variable must be an own struct field.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { assertNoErrors, type Generated, generateIn, importGenerated } from "./utils/generator.ts"

const config = { schema: "./schema.graphql", documents: ["src/*.graphql"] }

const located = (generated: Generated) =>
  generated.result.diagnostics.map(({ column, line, path, severity }) => ({ severity, path, line, column }))

describe("Generator module graph", () => {
  it.effect("fragments spread across two files in both directions are a located error, not a module cycle", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x: Int! }",
        "src/a.graphql": "fragment A2 on Query { x }\nfragment A1 on Query { ...B1 }\nquery Q { ...A1 }",
        "src/b.graphql": "fragment B1 on Query { ...A2 }"
      }, config)
      assert.deepStrictEqual(located(generated), [{ severity: "error", path: "src/a.graphql", line: 2, column: 24 }])
      const message = generated.result.diagnostics[0]!.message
      assert.match(message, /cycle/i)
      assert.include(message, "a.graphql")
      assert.include(message, "b.graphql")
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a fragment imported one way loads and decodes", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x: Int! }",
        "src/a.graphql": "fragment A2 on Query { x }",
        "src/b.graphql": "fragment B1 on Query { ...A2 }\nquery Q { ...B1 }"
      }, config)
      assertNoErrors(generated)
      const b = yield* importGenerated(generated, "src/b.graphql.ts")
      assert.deepStrictEqual(Schema.decodeUnknownSync(b.Q.result)({ x: 1 }), { x: 1 })
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator group bindings", () => {
  it.effect("a local fragment named like the file's group is a located error", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x: Int! }",
        "src/ops.graphql": "fragment OpsGroup on Query { x }\nquery Q { ...OpsGroup }"
      }, config)
      assert.deepStrictEqual(located(generated), [{ severity: "error", path: "src/ops.graphql", line: 1, column: 10 }])
      assert.include(generated.result.diagnostics[0]!.message, `"OpsGroup"`)
      assert.match(generated.result.diagnostics[0]!.message, /group/)
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("an imported fragment named like the file's group is a located error at the spread", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x: Int! }",
        "src/frags.graphql": "fragment OpsGroup on Query { x }",
        "src/ops.graphql": "query Q { ...OpsGroup }"
      }, config)
      assert.deepStrictEqual(located(generated), [{ severity: "error", path: "src/ops.graphql", line: 1, column: 11 }])
      assert.include(generated.result.diagnostics[0]!.message, `"OpsGroup"`)
      assert.match(generated.result.diagnostics[0]!.message, /group/)
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a fragment-only file may use its own group name, since it exports no group", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x: Int! }",
        "src/frags.graphql": "fragment FragsGroup on Query { x }",
        "src/ops.graphql": "query Q { ...FragsGroup }"
      }, config)
      assertNoErrors(generated)
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      assert.deepStrictEqual(Schema.decodeUnknownSync(ops.Q.result)({ x: 1 }), { x: 1 })
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator schema names", () => {
  it.effect("an enum named Schema and an input object named default load and round-trip", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql":
          "enum Schema { X Y }\ninput default { value: Schema }\ntype Query { value(filter: default): Schema! }",
        "src/ops.graphql": "query Q($filter: default) { value(filter: $filter) }"
      }, config)
      assertNoErrors(generated)
      const shared = yield* importGenerated(generated, "schema.graphql.ts")
      assert.deepStrictEqual(shared.Schema.literals, ["X", "Y"])
      assert.isDefined(shared.default)
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      assert.deepStrictEqual(Schema.decodeUnknownSync(ops.Q.result)({ value: "X" }), { value: "X" })
      assert.deepStrictEqual(Schema.encodeSync(ops.Q.variables)({ filter: { value: "Y" } }), { filter: { value: "Y" } })
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator __proto__ keys", () => {
  it.effect("a __proto__ alias and variable are own struct fields that decode and encode", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "type Query { x(n: Int): Int! }",
        "src/ops.graphql": "query Q($__proto__: Int) { __proto__: x(n: $__proto__) }"
      }, config)
      assertNoErrors(generated)
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      assert.deepStrictEqual(Object.keys(ops.Q.result.fields), ["__proto__"])
      assert.deepStrictEqual(Object.keys(ops.Q.variables.fields), ["__proto__"])
      const decoded = Schema.decodeUnknownSync(ops.Q.result)(JSON.parse(`{"__proto__":1}`))
      assert.isTrue(Object.hasOwn(decoded, "__proto__"))
      assert.strictEqual(decoded["__proto__"], 1)
      const encoded = Schema.encodeSync(ops.Q.variables)(JSON.parse(`{"__proto__":3}`))
      assert.isTrue(Object.hasOwn(encoded, "__proto__"))
      assert.strictEqual(encoded["__proto__"], 3)
    }).pipe(Effect.provide(NodeServices.layer)))
})
