import { sanitizeJavaScriptIdentifier, topologicalSort } from "effect/internal/schema/representation"
import { describe, it } from "vitest"
import { deepStrictEqual, strictEqual } from "../../utils/assert.ts"

function addChecks(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(addChecks)
  if (typeof input !== "object" || input === null) return input
  const record = input as Record<string, unknown>
  const out = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, addChecks(value)]))
  return typeof record._tag === "string" && record._tag !== "Reference" && !Array.isArray(record.checks)
    ? { ...out, checks: [] }
    : out
}

function stripEmptyChecks(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripEmptyChecks)
  if (typeof input !== "object" || input === null) return input
  return Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) =>
      key === "checks" && Array.isArray(value) && value.length === 0
        ? []
        : [[key, stripEmptyChecks(value)]]
    )
  )
}

describe("sanitizeJavaScriptIdentifier", () => {
  it("returns '_' for empty input", () => {
    strictEqual(sanitizeJavaScriptIdentifier(""), "_")
  })

  it("returns input when already a valid uppercase-start identifier", () => {
    strictEqual(sanitizeJavaScriptIdentifier("Abc"), "Abc")
    strictEqual(sanitizeJavaScriptIdentifier("_"), "_")
    strictEqual(sanitizeJavaScriptIdentifier("$"), "$")
    strictEqual(sanitizeJavaScriptIdentifier("$a_b9"), "$a_b9")
    strictEqual(sanitizeJavaScriptIdentifier("A1b2"), "A1b2")
  })

  it("uppercases a leading ASCII letter", () => {
    strictEqual(sanitizeJavaScriptIdentifier("abc"), "Abc")
    strictEqual(sanitizeJavaScriptIdentifier("a0"), "A0")
    strictEqual(sanitizeJavaScriptIdentifier("a1b2c3"), "A1b2c3")
    strictEqual(sanitizeJavaScriptIdentifier("class"), "Class")
  })

  it("prefixes '_' when starting with a digit", () => {
    strictEqual(sanitizeJavaScriptIdentifier("1"), "_1")
    strictEqual(sanitizeJavaScriptIdentifier("1a"), "_1a")
    strictEqual(sanitizeJavaScriptIdentifier("9lives"), "_9lives")
  })

  it("replaces invalid leading characters with '_'", () => {
    strictEqual(sanitizeJavaScriptIdentifier(" abc"), "_abc")
    strictEqual(sanitizeJavaScriptIdentifier("-a"), "_a")
    strictEqual(sanitizeJavaScriptIdentifier(".a"), "_a")
    strictEqual(sanitizeJavaScriptIdentifier(" a"), "_a")
    strictEqual(sanitizeJavaScriptIdentifier("\ta"), "_a")
  })

  it("replaces invalid characters with '_'", () => {
    strictEqual(sanitizeJavaScriptIdentifier("a-b"), "A_b")
    strictEqual(sanitizeJavaScriptIdentifier("a b"), "A_b")
    strictEqual(sanitizeJavaScriptIdentifier("a.b"), "A_b")
    strictEqual(sanitizeJavaScriptIdentifier("a/b"), "A_b")
  })

  it("replaces multiple invalid characters with '_'", () => {
    strictEqual(sanitizeJavaScriptIdentifier("a-b c"), "A_b_c")
    strictEqual(sanitizeJavaScriptIdentifier("a..b"), "A__b")
    strictEqual(sanitizeJavaScriptIdentifier("a--b"), "A__b")
    strictEqual(sanitizeJavaScriptIdentifier("a b\tc"), "A_b_c")
  })

  it("replaces non-ascii characters with '_' under ASCII rules", () => {
    strictEqual(sanitizeJavaScriptIdentifier("café"), "Caf_")
    strictEqual(sanitizeJavaScriptIdentifier("你好"), "__")
    strictEqual(sanitizeJavaScriptIdentifier("🤖"), "_")
    strictEqual(sanitizeJavaScriptIdentifier("a🤖b"), "A_b")
  })

  it("allows '$' and '_' anywhere", () => {
    strictEqual(sanitizeJavaScriptIdentifier("a$b"), "A$b")
    strictEqual(sanitizeJavaScriptIdentifier("a_b"), "A_b")
    strictEqual(sanitizeJavaScriptIdentifier("$a_b9"), "$a_b9")
  })

  it("keeps already-sanitized results stable (idempotent)", () => {
    const cases = [
      "",
      "abc",
      "_",
      "$",
      "a1b2",
      "a-b",
      "a b",
      "1a",
      "-a",
      "class",
      "café",
      "a🤖b"
    ] as const

    for (const input of cases) {
      const once = sanitizeJavaScriptIdentifier(input)
      const twice = sanitizeJavaScriptIdentifier(once)
      strictEqual(twice, once)
    }
  })

  it("preserves length when only replacements are needed", () => {
    strictEqual(sanitizeJavaScriptIdentifier("a-b").length, "a-b".length)
    strictEqual(sanitizeJavaScriptIdentifier("a b").length, "a b".length)
    strictEqual(sanitizeJavaScriptIdentifier("..").length, "..".length)
  })

  it("increases length only when prefixing is required", () => {
    strictEqual(sanitizeJavaScriptIdentifier("1a"), "_1a")
    strictEqual(sanitizeJavaScriptIdentifier("1a").length, "1a".length + 1)
  })
})

describe("topologicalSort", () => {
  function assertTopologicalSort(definitions: Record<string, unknown>, expected: unknown) {
    deepStrictEqual(stripEmptyChecks(topologicalSort(addChecks(definitions) as any)), stripEmptyChecks(expected))
  }

  it("empty definitions", () => {
    assertTopologicalSort(
      {},
      { nonRecursives: [], recursives: {} }
    )
  })

  it("single definition with no dependencies", () => {
    assertTopologicalSort(
      {
        A: { _tag: "String", checks: [] }
      },
      {
        nonRecursives: [
          { $ref: "A", representation: { _tag: "String", checks: [] } }
        ],
        recursives: {}
      }
    )
  })

  it("multiple independent definitions", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: { _tag: "Number", checks: [] },
      C: { _tag: "Boolean" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        { $ref: "B", representation: { _tag: "Number", checks: [] } },
        { $ref: "C", representation: { _tag: "Boolean" } }
      ],
      recursives: {}
    })
  })

  it("A -> B -> C", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: { _tag: "Reference", $ref: "A" },
      C: { _tag: "Reference", $ref: "B" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } },
        { $ref: "C", representation: { _tag: "Reference", $ref: "B" } }
      ],
      recursives: {}
    })
  })

  it("A -> B, A -> C", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: { _tag: "Reference", $ref: "A" },
      C: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } },
        { $ref: "C", representation: { _tag: "Reference", $ref: "A" } }
      ],
      recursives: {}
    })
  })

  it("A -> B -> C, A -> D", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: { _tag: "Reference", $ref: "A" },
      C: { _tag: "Reference", $ref: "B" },
      D: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } },
        { $ref: "D", representation: { _tag: "Reference", $ref: "A" } },
        { $ref: "C", representation: { _tag: "Reference", $ref: "B" } }
      ],
      recursives: {}
    })
  })

  it("finds references in declarations, annotations, groups, template literals and unions", () => {
    const definitions = {
      A: { _tag: "String", checks: [] },
      B: { _tag: "Number", checks: [] },
      C: { _tag: "Boolean", checks: [] },
      D: {
        _tag: "Declaration",
        typeParameters: [{ _tag: "Reference", $ref: "A" }],
        annotations: {
          representation: {
            schemas: [{ _tag: "Reference", $ref: "B" }]
          }
        },
        checks: [{
          _tag: "FilterGroup",
          checks: [{
            _tag: "Filter",
            aborted: false,
            annotations: {
              representation: {
                schemas: [{ _tag: "Reference", $ref: "C" }]
              }
            }
          }]
        }]
      },
      E: {
        _tag: "TemplateLiteral",
        parts: [{ _tag: "Reference", $ref: "D" }],
        checks: []
      },
      F: {
        _tag: "Union",
        types: [{ _tag: "Reference", $ref: "E" }, { _tag: "Reference", $ref: "A" }],
        mode: "anyOf",
        checks: []
      }
    }
    assertTopologicalSort(definitions, {
      nonRecursives: ["A", "B", "C", "D", "E", "F"].map(($ref) => ({
        $ref,
        representation: definitions[$ref as keyof typeof definitions]
      })),
      recursives: {}
    })
  })

  it("self-referential definition (A -> A)", () => {
    assertTopologicalSort({
      A: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [],
      recursives: {
        A: { _tag: "Reference", $ref: "A" }
      }
    })
  })

  it("mutual recursion (A -> B -> A)", () => {
    assertTopologicalSort({
      A: { _tag: "Reference", $ref: "B" },
      B: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [],
      recursives: {
        A: { _tag: "Reference", $ref: "B" },
        B: { _tag: "Reference", $ref: "A" }
      }
    })
  })

  it("complex cycle (A -> B -> C -> A)", () => {
    assertTopologicalSort({
      A: { _tag: "Reference", $ref: "B" },
      B: { _tag: "Reference", $ref: "C" },
      C: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [],
      recursives: {
        A: { _tag: "Reference", $ref: "B" },
        B: { _tag: "Reference", $ref: "C" },
        C: { _tag: "Reference", $ref: "A" }
      }
    })
  })

  it("mixed recursive and non-recursive definitions", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: { _tag: "Reference", $ref: "A" },
      C: { _tag: "Reference", $ref: "C" },
      D: { _tag: "Reference", $ref: "E" },
      E: { _tag: "Reference", $ref: "D" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } }
      ],
      recursives: {
        C: { _tag: "Reference", $ref: "C" },
        D: { _tag: "Reference", $ref: "E" },
        E: { _tag: "Reference", $ref: "D" }
      }
    })
  })

  it("nested $ref in object properties", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: {
        _tag: "Objects",
        propertySignatures: [{
          name: "value",
          type: { _tag: "Reference", $ref: "A" },
          isOptional: false,
          isMutable: false
        }],
        indexSignatures: [],
        checks: []
      }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        {
          $ref: "B",
          representation: {
            _tag: "Objects",
            propertySignatures: [{
              name: "value",
              type: { _tag: "Reference", $ref: "A" },
              isOptional: false,
              isMutable: false
            }],
            indexSignatures: [],
            checks: []
          }
        }
      ],
      recursives: {}
    })
  })

  it("nested $ref in array rest", () => {
    assertTopologicalSort({
      A: { _tag: "String", checks: [] },
      B: {
        _tag: "Arrays",
        elements: [],
        rest: [{ _tag: "Reference", $ref: "A" }],
        checks: []
      }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "String", checks: [] } },
        {
          $ref: "B",
          representation: { _tag: "Arrays", elements: [], rest: [{ _tag: "Reference", $ref: "A" }], checks: [] }
        }
      ],
      recursives: {}
    })
  })

  it("finds shared references in tuple elements and index signatures", () => {
    const shared = { _tag: "Reference" as const, $ref: "A" }
    const definitions = {
      A: { _tag: "String" as const, checks: [] },
      B: {
        _tag: "Arrays" as const,
        elements: [{ isOptional: false, type: shared }],
        rest: [shared],
        checks: []
      },
      C: {
        _tag: "Objects" as const,
        propertySignatures: [],
        indexSignatures: [{ parameter: shared, type: shared }],
        checks: []
      }
    }

    deepStrictEqual(topologicalSort(definitions), {
      nonRecursives: ["A", "B", "C"].map(($ref) => ({
        $ref,
        representation: definitions[$ref as keyof typeof definitions]
      })),
      recursives: {}
    })
  })

  it("external $ref (not in definitions) should be ignored", () => {
    assertTopologicalSort({
      A: { _tag: "Reference", $ref: "#/definitions/External" },
      B: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [
        { $ref: "A", representation: { _tag: "Reference", $ref: "#/definitions/External" } },
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } }
      ],
      recursives: {}
    })
  })

  it("multiple cycles with independent definitions", () => {
    assertTopologicalSort({
      Independent: { _tag: "String", checks: [] },
      A: { _tag: "Reference", $ref: "B" },
      B: { _tag: "Reference", $ref: "A" },
      C: { _tag: "Reference", $ref: "D" },
      D: { _tag: "Reference", $ref: "C" }
    }, {
      nonRecursives: [
        { $ref: "Independent", representation: { _tag: "String", checks: [] } }
      ],
      recursives: {
        A: { _tag: "Reference", $ref: "B" },
        B: { _tag: "Reference", $ref: "A" },
        C: { _tag: "Reference", $ref: "D" },
        D: { _tag: "Reference", $ref: "C" }
      }
    })
  })

  it("definition depending on recursive definition", () => {
    assertTopologicalSort({
      A: { _tag: "Reference", $ref: "A" },
      B: { _tag: "Reference", $ref: "A" }
    }, {
      nonRecursives: [
        { $ref: "B", representation: { _tag: "Reference", $ref: "A" } }
      ],
      recursives: {
        A: { _tag: "Reference", $ref: "A" }
      }
    })
  })
})
