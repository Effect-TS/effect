import { assert, it } from "@effect/vitest"
import { Schema } from "effect"

// packages/effect/src/internal/schema/standardSchema.ts:56 — `"~standard" in self` also matches a
// `~standard` inherited from a parent class, so the child gets the parent's adapter.
// Contract (Schema.ts:1271 JSDoc): `validate` decodes and validates the input against the *provided* schema.
it("toStandardSchemaV1 on a subclass validates the subclass fields", () => {
  class Parent extends Schema.Class<Parent>("Parent")({ a: Schema.String }) {}
  Schema.toStandardSchemaV1(Parent)
  class Child extends Parent.extend<Child>("Child")({ b: Schema.Number }) {}
  assert.deepStrictEqual(
    Schema.toStandardSchemaV1(Child)["~standard"].validate({ a: "a" }),
    { issues: [{ path: ["b"], message: "Missing key" }] }
  )
})
