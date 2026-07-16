import { SchemaRepresentation } from "effect"
import { describe, it } from "vitest"
import { deepStrictEqual, throws } from "../../utils/assert.ts"
import { canonicalize } from "./testUtils.ts"

function omitDefaultExpected(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(omitDefaultExpected)
  if (typeof input !== "object" || input === null || Object.getPrototypeOf(input) !== Object.prototype) return input
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === "expected") continue
    const normalized = omitDefaultExpected(value)
    if (
      key === "annotations" && typeof normalized === "object" && normalized !== null &&
      Object.keys(normalized).length === 0
    ) continue
    out[key] = normalized
  }
  return out
}

describe("fromJsonSchemaMultiDocument2 parity", () => {
  it("preserves root order and shares definitions", () => {
    const document = SchemaRepresentation.fromSchemaMultiDocument(SchemaRepresentation.fromJsonSchemaMultiDocument({
      dialect: "draft-2020-12",
      schemas: [
        { $ref: "#/$defs/A" },
        { $ref: "#/$defs/A", description: "second" },
        { type: "array", items: { $ref: "#/$defs/A" } },
        { $ref: "#/$defs/A", description: "fourth" }
      ],
      definitions: {
        A: { type: "string", minLength: 1 }
      }
    }))

    const definition = {
      _tag: "String" as const,
      checks: [{
        _tag: "Filter" as const,
        representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
      }]
    }
    deepStrictEqual(
      omitDefaultExpected(canonicalize(document)),
      omitDefaultExpected(canonicalize({
        representations: [
          { _tag: "Reference", $ref: "A" },
          {
            _tag: "Suspend",
            checks: [],
            annotations: { description: "second" },
            thunk: { _tag: "Reference", $ref: "A" }
          },
          {
            _tag: "Arrays",
            elements: [],
            rest: [{ _tag: "Reference", $ref: "A" }],
            checks: []
          },
          {
            _tag: "Suspend",
            checks: [],
            annotations: { description: "fourth" },
            thunk: { _tag: "Reference", $ref: "A" }
          }
        ],
        references: { A: definition }
      }))
    )
  })

  it("resolves alias chains when combining a reference", () => {
    const document = SchemaRepresentation.fromSchemaMultiDocument(SchemaRepresentation.fromJsonSchemaMultiDocument({
      dialect: "draft-2020-12",
      schemas: [{ $ref: "#/$defs/A", description: "root" }],
      definitions: {
        A: { $ref: "#/$defs/B" },
        B: { $ref: "#/$defs/C" },
        C: { type: "number" }
      }
    }))

    deepStrictEqual(
      omitDefaultExpected(canonicalize(document)),
      omitDefaultExpected(canonicalize({
        representations: [{
          _tag: "Suspend",
          checks: [],
          annotations: { description: "root" },
          thunk: { _tag: "Reference", $ref: "A" }
        }],
        references: {
          A: { _tag: "Reference", $ref: "B" },
          B: { _tag: "Reference", $ref: "C" },
          C: {
            _tag: "Number",
            checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }]
          }
        }
      }))
    )
  })

  it("tracks recursive definitions independently", () => {
    const document = SchemaRepresentation.fromSchemaMultiDocument(SchemaRepresentation.fromJsonSchemaMultiDocument({
      dialect: "draft-2020-12",
      schemas: [{ $ref: "#/$defs/A" }, { $ref: "#/$defs/B" }],
      definitions: {
        A: { $ref: "#/$defs/A" },
        B: { $ref: "#/$defs/B" }
      }
    }))

    deepStrictEqual(
      omitDefaultExpected(canonicalize(document)),
      omitDefaultExpected(canonicalize({
        representations: [
          { _tag: "Reference", $ref: "A" },
          { _tag: "Reference", $ref: "B" }
        ],
        references: {
          A: {
            _tag: "Suspend",
            annotations: { identifier: "A" },
            thunk: { _tag: "Reference", $ref: "A" }
          },
          B: {
            _tag: "Suspend",
            annotations: { identifier: "B" },
            thunk: { _tag: "Reference", $ref: "B" }
          }
        }
      }))
    )
  })

  it("throws when a reference that must be resolved is missing", () => {
    throws(
      () =>
        SchemaRepresentation.fromJsonSchemaMultiDocument({
          dialect: "draft-2020-12",
          schemas: [{ $ref: "#/$defs/Missing", description: "resolve" }],
          definitions: {}
        }),
      "Invalid reference Missing\n  at [\"schemas\"][0][\"$ref\"]"
    )
  })

  it("throws when resolving a circular alias chain", () => {
    throws(
      () =>
        SchemaRepresentation.fromJsonSchemaMultiDocument({
          dialect: "draft-2020-12",
          schemas: [{ $ref: "#/$defs/A", description: "resolve" }],
          definitions: {
            A: { $ref: "#/$defs/B" },
            B: { $ref: "#/$defs/A" }
          }
        }),
      "Invalid reference A\n  at [\"schemas\"][0][\"$ref\"]"
    )
  })
})
