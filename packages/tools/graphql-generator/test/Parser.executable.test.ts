import { print } from "@effect/graphql-generator/internal/Printer"
import { assert, describe, it } from "@effect/vitest"
import {
  argumentValue,
  assertDefinitions,
  assertDiagnostic,
  name,
  namedType,
  parseOrThrow,
  str,
  stripLoc
} from "./utils/ast.ts"
import { executableDiagnostics, executableSections } from "./utils/cases.ts"

describe("Parser: executable documents", () => {
  for (const { cases, section } of executableSections) {
    describe(section, () => {
      for (const testCase of cases) {
        it(`${testCase.name} parses to the expected document`, () => {
          assert.strictEqual(print(parseOrThrow(testCase.source)), testCase.printed)
        })
      }
    })
  }

  describe("AST shapes", () => {
    it("an operation with everything", () => {
      assertDefinitions(
        "query Q($id: ID!, $n: Int = 10) @dir(x: 1) { node(id: $id) @include(if: true) { ... on Issue @d { title } ...F ... { id } } alias: f }",
        [{
          _tag: "OperationDefinition",
          operation: "query",
          name: name("Q"),
          variableDefinitions: [
            {
              _tag: "VariableDefinition",
              variable: { _tag: "Variable", name: name("id") },
              type: { _tag: "NonNullType", type: namedType("ID") },
              directives: []
            },
            {
              _tag: "VariableDefinition",
              variable: { _tag: "Variable", name: name("n") },
              type: namedType("Int"),
              defaultValue: { _tag: "IntValue", value: "10" },
              directives: []
            }
          ],
          directives: [{
            _tag: "Directive",
            name: name("dir"),
            arguments: [{ _tag: "Argument", name: name("x"), value: { _tag: "IntValue", value: "1" } }]
          }],
          selectionSet: {
            _tag: "SelectionSet",
            selections: [
              {
                _tag: "Field",
                name: name("node"),
                arguments: [{ _tag: "Argument", name: name("id"), value: { _tag: "Variable", name: name("id") } }],
                directives: [{
                  _tag: "Directive",
                  name: name("include"),
                  arguments: [{ _tag: "Argument", name: name("if"), value: { _tag: "BooleanValue", value: true } }]
                }],
                selectionSet: {
                  _tag: "SelectionSet",
                  selections: [
                    {
                      _tag: "InlineFragment",
                      typeCondition: namedType("Issue"),
                      directives: [{ _tag: "Directive", name: name("d"), arguments: [] }],
                      selectionSet: {
                        _tag: "SelectionSet",
                        selections: [{ _tag: "Field", name: name("title"), arguments: [], directives: [] }]
                      }
                    },
                    { _tag: "FragmentSpread", name: name("F"), directives: [] },
                    {
                      _tag: "InlineFragment",
                      directives: [],
                      selectionSet: {
                        _tag: "SelectionSet",
                        selections: [{ _tag: "Field", name: name("id"), arguments: [], directives: [] }]
                      }
                    }
                  ]
                }
              },
              { _tag: "Field", alias: name("alias"), name: name("f"), arguments: [], directives: [] }
            ]
          }
        }]
      )
    })

    it("the shorthand is a query without a name", () => {
      assertDefinitions("{ a }", [{
        _tag: "OperationDefinition",
        operation: "query",
        variableDefinitions: [],
        directives: [],
        selectionSet: {
          _tag: "SelectionSet",
          selections: [{ _tag: "Field", name: name("a"), arguments: [], directives: [] }]
        }
      }])
    })

    it("a fragment definition", () => {
      assertDefinitions("fragment F on Node @e { id }", [{
        _tag: "FragmentDefinition",
        name: name("F"),
        typeCondition: namedType("Node"),
        directives: [{ _tag: "Directive", name: name("e"), arguments: [] }],
        selectionSet: {
          _tag: "SelectionSet",
          selections: [{ _tag: "Field", name: name("id"), arguments: [], directives: [] }]
        }
      }])
    })

    it("value kinds", () => {
      assert.deepStrictEqual(argumentValue("1"), { _tag: "IntValue", value: "1" })
      assert.deepStrictEqual(argumentValue("-1"), { _tag: "IntValue", value: "-1" })
      assert.deepStrictEqual(argumentValue("1.0"), { _tag: "FloatValue", value: "1.0" })
      assert.deepStrictEqual(argumentValue("1e5"), { _tag: "FloatValue", value: "1e5" })
      assert.deepStrictEqual(argumentValue("-1.5E-3"), { _tag: "FloatValue", value: "-1.5E-3" })
      assert.deepStrictEqual(argumentValue("true"), { _tag: "BooleanValue", value: true })
      assert.deepStrictEqual(argumentValue("false"), { _tag: "BooleanValue", value: false })
      assert.deepStrictEqual(argumentValue("null"), { _tag: "NullValue" })
      assert.deepStrictEqual(argumentValue("TRUE"), { _tag: "EnumValue", value: "TRUE" })
      assert.deepStrictEqual(argumentValue("$v"), { _tag: "Variable", name: name("v") })
      assert.deepStrictEqual(argumentValue("[1, $v]"), {
        _tag: "ListValue",
        values: [{ _tag: "IntValue", value: "1" }, { _tag: "Variable", name: name("v") }]
      })
      assert.deepStrictEqual(argumentValue("{a: \"s\", b: {}}"), {
        _tag: "ObjectValue",
        fields: [
          { _tag: "ObjectField", name: name("a"), value: { _tag: "StringValue", value: "s" } },
          { _tag: "ObjectField", name: name("b"), value: { _tag: "ObjectValue", fields: [] } }
        ]
      })
    })

    it("locations are UTF-16 offsets into the body with an exclusive end", () => {
      const document = parseOrThrow("{ a }")
      assert.deepStrictEqual(document.loc, { start: 0, end: 5 })
      const operation = document.definitions[0]!
      assert.deepStrictEqual(operation.loc, { start: 0, end: 5 })
      assert(operation._tag === "OperationDefinition")
      const field = operation.selectionSet.selections[0]!
      assert.deepStrictEqual(field.loc, { start: 2, end: 3 })
    })

    it("the same text parses to the same AST wherever it sits", () => {
      const a = stripLoc(parseOrThrow("query Q { a(b: 1) }"))
      const b = stripLoc(parseOrThrow("# comment\n\nquery   Q   {\n  a(b: 1),\n}\n"))
      assert.deepStrictEqual(a, b)
    })
  })

  describe("descriptions (September 2025 edition)", () => {
    // Expectations are untyped until `Ast.ts` gains `description` on these three nodes.
    const definitionsOf = (body: string): unknown => stripLoc(parseOrThrow(body)).definitions

    it("operations and variable definitions carry descriptions", () => {
      assert.deepStrictEqual(definitionsOf("\"op doc\" query Q(\"x doc\" $x: Int, $y: Int \"late\" $z: Int) { a }"), [{
        _tag: "OperationDefinition",
        description: str("op doc"),
        operation: "query",
        name: name("Q"),
        variableDefinitions: [
          {
            _tag: "VariableDefinition",
            description: str("x doc"),
            variable: { _tag: "Variable", name: name("x") },
            type: namedType("Int"),
            directives: []
          },
          {
            _tag: "VariableDefinition",
            variable: { _tag: "Variable", name: name("y") },
            type: namedType("Int"),
            directives: []
          },
          {
            _tag: "VariableDefinition",
            description: str("late"),
            variable: { _tag: "Variable", name: name("z") },
            type: namedType("Int"),
            directives: []
          }
        ],
        directives: [],
        selectionSet: {
          _tag: "SelectionSet",
          selections: [{ _tag: "Field", name: name("a"), arguments: [], directives: [] }]
        }
      }])
    })

    it("fragments carry descriptions", () => {
      assert.deepStrictEqual(definitionsOf("\"\"\"\n  frag doc\n\"\"\" fragment F on T { a }"), [{
        _tag: "FragmentDefinition",
        description: str("frag doc"),
        name: name("F"),
        typeCondition: namedType("T"),
        directives: [],
        selectionSet: {
          _tag: "SelectionSet",
          selections: [{ _tag: "Field", name: name("a"), arguments: [], directives: [] }]
        }
      }])
    })
  })

  describe("diagnostics", () => {
    for (const testCase of executableDiagnostics) {
      it(testCase.name, () => {
        assertDiagnostic(testCase.source, { line: testCase.line, column: testCase.column, message: testCase.message })
      })
    }
  })
})
