/**
 * Pins the vendored GitHub schema fixtures (see `test/fixtures/github/README.md`).
 * When a refresh changes these numbers, update them here on purpose so later
 * slices notice fixture drift.
 */
import type * as Ast from "@effect/graphql-generator/internal/Ast"
import { assert, describe, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { parseOrThrow } from "./utils/ast.ts"

const fixture = (file: string) => readFileSync(new URL(`./fixtures/github/${file}`, import.meta.url), "utf8")

describe("GitHub fixture", () => {
  describe("schema.docs.graphql", () => {
    it("parses with no diagnostics into the pinned number of definitions", () => {
      const document = parseOrThrow(fixture("schema.docs.graphql"), "schema.docs.graphql")
      const counts: Record<string, number> = {}
      for (const definition of document.definitions) {
        counts[definition._tag] = (counts[definition._tag] ?? 0) + 1
      }
      assert.deepStrictEqual(counts, {
        DirectiveDefinition: 3,
        ScalarTypeDefinition: 13,
        ObjectTypeDefinition: 1032,
        InterfaceTypeDefinition: 50,
        UnionTypeDefinition: 48,
        EnumTypeDefinition: 257,
        InputObjectTypeDefinition: 424
      })
      assert.strictEqual(document.definitions.length, 1827)
    })

    it("declares its three custom directives first and has no schema block", () => {
      const document = parseOrThrow(fixture("schema.docs.graphql"), "schema.docs.graphql")
      const directives = document.definitions
        .filter((definition): definition is Ast.DirectiveDefinition => definition._tag === "DirectiveDefinition")
        .map((definition) => definition.name.value)
      assert.deepStrictEqual(directives, ["preview", "possibleTypes", "docsCategory"])
      assert.deepStrictEqual(document.definitions.slice(0, 3).map((definition) => definition._tag), [
        "DirectiveDefinition",
        "DirectiveDefinition",
        "DirectiveDefinition"
      ])
      assert.isFalse(document.definitions.some((definition) => definition._tag === "SchemaDefinition"))
    })
  })

  describe("schema.json", () => {
    it("is the bare __schema shape with the pinned type count", () => {
      const json = JSON.parse(fixture("schema.json")) as {
        readonly __schema: {
          readonly queryType: { readonly name: string }
          readonly mutationType: { readonly name: string } | null
          readonly subscriptionType: { readonly name: string } | null
          readonly types: ReadonlyArray<unknown>
          readonly directives: ReadonlyArray<unknown>
        }
        readonly data?: unknown
      }
      assert.isUndefined(json.data)
      assert.strictEqual(json.__schema.queryType.name, "Query")
      assert.deepStrictEqual(json.__schema.mutationType, { name: "Mutation" })
      assert.isNull(json.__schema.subscriptionType)
      assert.strictEqual(json.__schema.types.length, 1606)
      assert.strictEqual(json.__schema.directives.length, 6)
    })
  })
})
