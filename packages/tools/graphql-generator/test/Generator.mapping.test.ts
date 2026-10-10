/**
 * Mapping rules and output locations the snapshot sets don't exercise
 * (EFF-1832 points 4 and 5, EFF-1834 points 5 to 7), asserted on the text
 * `generate` emits for `taskSchemaSdl`. The shared module defaults to
 * `schema/app.graphql.ts` next to the schema.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { assertNoErrors, declaration, docOf, generateTasks, member, taskConfig } from "./utils/generator.ts"

describe("Generator mapping", () => {
  it.effect("a non-null variable with a default is optional(T) and keeps the default as @default", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/ops.graphql": "query Tasks($first: Int! = 20) { tasks(first: $first) { id } }"
      })
      assertNoErrors(generated)
      const ops = generated.file("src/ops.graphql.ts")
      assert.strictEqual(member(ops, "first"), "Schema.optional(Shared.Int)")
      assert.deepStrictEqual(docOf(ops, "first"), ["@default 20"])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a scalars entry overrides a built-in", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks(
        { "src/ops.graphql": "query Tasks { tasks { id } }" },
        { ...taskConfig, scalars: { ID: "./scalars.ts#NodeId" } }
      )
      assertNoErrors(generated)
      assert.match(declaration(generated.file("schema/app.graphql.ts"), "ID"), /^export const ID = \w+\.NodeId$/)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("the shared module defaults to the schema's name and directory", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({ "src/ops.graphql": "query Tasks { tasks { id } }" })
      assertNoErrors(generated)
      assert.deepStrictEqual(generated.paths, ["schema/app.graphql.ts", "src/ops.graphql.ts"])
      assert.match(generated.file("src/ops.graphql.ts"), /^import \* as Shared from "\.\.\/schema\/app\.graphql\.ts"$/m)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("importExtension applies to generated and relative scalar modules, not bare specifiers", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks(
        { "src/ops.graphql": "query Tasks { tasks { due bodyHTML } }" },
        { ...taskConfig, importExtension: ".js", scalars: { ...taskConfig.scalars, HTML: "@acme/scalars#HTML" } }
      )
      assertNoErrors(generated)
      const shared = generated.file("schema/app.graphql.ts")
      assert.match(generated.file("src/ops.graphql.ts"), /^import \* as Shared from "\.\.\/schema\/app\.graphql\.js"$/m)
      assert.match(shared, /^import \* as \w+ from "\.\.\/scalars\.js"$/m)
      assert.match(shared, /^import \* as \w+ from "@acme\/scalars"$/m)
    }).pipe(Effect.provide(NodeServices.layer)))
})
