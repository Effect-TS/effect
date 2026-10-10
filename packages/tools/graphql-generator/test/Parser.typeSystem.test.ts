import { parseConstValue } from "@effect/graphql-generator/internal/Parser"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"
import {
  argument,
  assertDefinitions,
  assertDiagnostic,
  directive,
  fieldDefinition,
  inputValue,
  int,
  list,
  name,
  namedType,
  nonNull,
  operationType,
  source,
  str,
  stripLoc
} from "./utils/ast.ts"

describe("Parser: type-system documents", () => {
  describe("definitions", () => {
    it("schema definition with a description and directives", () => {
      assertDefinitions("\"\"\"Root\"\"\" schema @d(x: 1) { query: Q mutation: M subscription: S }", [{
        _tag: "SchemaDefinition",
        description: str("Root"),
        directives: [directive("d", [argument("x", int("1"))])],
        operationTypes: [
          operationType("query", "Q"),
          operationType("mutation", "M"),
          operationType("subscription", "S")
        ]
      }])
    })

    it("scalar with @specifiedBy", () => {
      assertDefinitions("\"ISO-8601\" scalar DateTime @specifiedBy(url: \"https://example.com\")", [{
        _tag: "ScalarTypeDefinition",
        description: str("ISO-8601"),
        name: name("DateTime"),
        directives: [directive("specifiedBy", [argument("url", str("https://example.com"))])]
      }])
    })

    it("object type: leading ampersand, field arguments, defaults, descriptions and deprecation", () => {
      assertDefinitions(
        `type T implements & A & B @d {
          "f doc"
          f("a doc" a: Int = 1, b: [String!]! @deprecated(reason: "r")): String! @deprecated
          g: T
        }`,
        [{
          _tag: "ObjectTypeDefinition",
          name: name("T"),
          interfaces: [namedType("A"), namedType("B")],
          directives: [directive("d")],
          fields: [
            fieldDefinition("f", nonNull(namedType("String")), {
              description: "f doc",
              arguments: [
                inputValue("a", namedType("Int"), { description: "a doc", defaultValue: int("1") }),
                inputValue("b", nonNull(list(nonNull(namedType("String")))), {
                  directives: [directive("deprecated", [argument("reason", str("r"))])]
                })
              ],
              directives: [directive("deprecated")]
            }),
            fieldDefinition("g", namedType("T"))
          ]
        }]
      )
    })

    it("object type without fields", () => {
      assertDefinitions("type Empty @d", [{
        _tag: "ObjectTypeDefinition",
        name: name("Empty"),
        interfaces: [],
        directives: [directive("d")],
        fields: []
      }])
    })

    it("interface implementing interfaces", () => {
      assertDefinitions("interface Child implements Parent & Other { id: ID! }", [{
        _tag: "InterfaceTypeDefinition",
        name: name("Child"),
        interfaces: [namedType("Parent"), namedType("Other")],
        directives: [],
        fields: [fieldDefinition("id", nonNull(namedType("ID")))]
      }])
    })

    it("union with a leading pipe", () => {
      assertDefinitions("union U @d = | A | B", [{
        _tag: "UnionTypeDefinition",
        name: name("U"),
        directives: [directive("d")],
        types: [namedType("A"), namedType("B")]
      }])
    })

    it("enum values with descriptions and directives", () => {
      assertDefinitions("enum E { \"a doc\" A @deprecated(reason: \"x\") B }", [{
        _tag: "EnumTypeDefinition",
        name: name("E"),
        directives: [],
        values: [
          {
            _tag: "EnumValueDefinition",
            description: str("a doc"),
            name: name("A"),
            directives: [directive("deprecated", [argument("reason", str("x"))])]
          },
          { _tag: "EnumValueDefinition", name: name("B"), directives: [] }
        ]
      }])
    })

    it("input object with const defaults of every kind", () => {
      assertDefinitions("input I { a: Int = 1 b: Point = {x: 1.5, y: [null, ENUM, \"s\", true]} @d }", [{
        _tag: "InputObjectTypeDefinition",
        name: name("I"),
        directives: [],
        fields: [
          inputValue("a", namedType("Int"), { defaultValue: int("1") }),
          inputValue("b", namedType("Point"), {
            defaultValue: {
              _tag: "ObjectValue",
              fields: [
                { _tag: "ObjectField", name: name("x"), value: { _tag: "FloatValue", value: "1.5" } },
                {
                  _tag: "ObjectField",
                  name: name("y"),
                  value: {
                    _tag: "ListValue",
                    values: [
                      { _tag: "NullValue" },
                      { _tag: "EnumValue", value: "ENUM" },
                      str("s"),
                      { _tag: "BooleanValue", value: true }
                    ]
                  }
                }
              ]
            },
            directives: [directive("d")]
          })
        ]
      }])
    })

    it("directive definitions: repeatable, locations, leading pipe", () => {
      assertDefinitions(
        "\"d\" directive @d(a: Int = 2) repeatable on QUERY | FIELD_DEFINITION | INPUT_FIELD_DEFINITION directive @e on | SCHEMA",
        [
          {
            _tag: "DirectiveDefinition",
            description: str("d"),
            name: name("d"),
            arguments: [inputValue("a", namedType("Int"), { defaultValue: int("2") })],
            repeatable: true,
            locations: [name("QUERY"), name("FIELD_DEFINITION"), name("INPUT_FIELD_DEFINITION")]
          },
          {
            _tag: "DirectiveDefinition",
            name: name("e"),
            arguments: [],
            repeatable: false,
            locations: [name("SCHEMA")]
          }
        ]
      )
    })

    it("block string descriptions are dedented", () => {
      assertDefinitions(
        `"""
        Multi
        line
        """
        type T {
          """
          Field
          """
          f: Int
        }`,
        [{
          _tag: "ObjectTypeDefinition",
          description: str("Multi\nline"),
          name: name("T"),
          interfaces: [],
          directives: [],
          fields: [fieldDefinition("f", namedType("Int"), { description: "Field" })]
        }]
      )
    })

    it("keywords are valid type and field names", () => {
      assertDefinitions("type Mutation { type: Int, input: String, extend: Boolean }", [{
        _tag: "ObjectTypeDefinition",
        name: name("Mutation"),
        interfaces: [],
        directives: [],
        fields: [
          fieldDefinition("type", namedType("Int")),
          fieldDefinition("input", namedType("String")),
          fieldDefinition("extend", namedType("Boolean"))
        ]
      }])
    })

    it("executable and type-system definitions can share a document", () => {
      assertDefinitions("type T { a: Int } query Q { a }", [
        {
          _tag: "ObjectTypeDefinition",
          name: name("T"),
          interfaces: [],
          directives: [],
          fields: [fieldDefinition("a", namedType("Int"))]
        },
        {
          _tag: "OperationDefinition",
          operation: "query",
          name: name("Q"),
          variableDefinitions: [],
          directives: [],
          selectionSet: {
            _tag: "SelectionSet",
            selections: [{ _tag: "Field", name: name("a"), arguments: [], directives: [] }]
          }
        }
      ])
    })
  })

  describe("extensions", () => {
    it("extend schema", () => {
      assertDefinitions("extend schema @d { query: Q } extend schema @e", [
        { _tag: "SchemaExtension", directives: [directive("d")], operationTypes: [operationType("query", "Q")] },
        { _tag: "SchemaExtension", directives: [directive("e")], operationTypes: [] }
      ])
    })

    it("extend scalar", () => {
      assertDefinitions("extend scalar S @d", [{
        _tag: "ScalarTypeExtension",
        name: name("S"),
        directives: [directive("d")]
      }])
    })

    it("extend type: interfaces, directives and fields in every combination", () => {
      assertDefinitions("extend type T implements I @d { f: Int } extend type T implements J extend type T @e", [
        {
          _tag: "ObjectTypeExtension",
          name: name("T"),
          interfaces: [namedType("I")],
          directives: [directive("d")],
          fields: [fieldDefinition("f", namedType("Int"))]
        },
        { _tag: "ObjectTypeExtension", name: name("T"), interfaces: [namedType("J")], directives: [], fields: [] },
        { _tag: "ObjectTypeExtension", name: name("T"), interfaces: [], directives: [directive("e")], fields: [] }
      ])
    })

    it("extend interface", () => {
      assertDefinitions("extend interface I implements J { f: Int }", [{
        _tag: "InterfaceTypeExtension",
        name: name("I"),
        interfaces: [namedType("J")],
        directives: [],
        fields: [fieldDefinition("f", namedType("Int"))]
      }])
    })

    it("extend union", () => {
      assertDefinitions("extend union U @d = A | B extend union U @e", [
        {
          _tag: "UnionTypeExtension",
          name: name("U"),
          directives: [directive("d")],
          types: [namedType("A"), namedType("B")]
        },
        { _tag: "UnionTypeExtension", name: name("U"), directives: [directive("e")], types: [] }
      ])
    })

    it("extend enum", () => {
      assertDefinitions("extend enum E @d { X } extend enum E @e", [
        {
          _tag: "EnumTypeExtension",
          name: name("E"),
          directives: [directive("d")],
          values: [{ _tag: "EnumValueDefinition", name: name("X"), directives: [] }]
        },
        { _tag: "EnumTypeExtension", name: name("E"), directives: [directive("e")], values: [] }
      ])
    })

    it("extend input", () => {
      assertDefinitions("extend input I @d { f: Int } extend input I @e", [
        {
          _tag: "InputObjectTypeExtension",
          name: name("I"),
          directives: [directive("d")],
          fields: [inputValue("f", namedType("Int"))]
        },
        { _tag: "InputObjectTypeExtension", name: name("I"), directives: [directive("e")], fields: [] }
      ])
    })
  })

  describe("diagnostics", () => {
    const cases = [
      {
        name: "extend scalar with nothing to extend",
        source: "extend scalar S",
        line: 1,
        column: 16,
        message: "Unexpected <EOF>."
      },
      {
        name: "extend type with nothing to extend",
        source: "extend type T",
        line: 1,
        column: 14,
        message: "Unexpected <EOF>."
      },
      {
        name: "extend schema with nothing to extend",
        source: "extend schema",
        line: 1,
        column: 14,
        message: "Unexpected <EOF>."
      },
      {
        name: "extend of an unknown kind",
        source: "extend foo",
        line: 1,
        column: 8,
        message: "Unexpected Name \"foo\"."
      },
      {
        name: "unterminated list type",
        source: "type T { f: [Int }",
        line: 1,
        column: 18,
        message: "Expected \"]\", found \"}\"."
      },
      {
        name: "field without a type",
        source: "type T { f }",
        line: 1,
        column: 12,
        message: "Expected \":\", found \"}\"."
      },
      { name: "empty fields block", source: "type T {}", line: 1, column: 9, message: "Expected Name, found \"}\"." },
      {
        name: "implements without a type",
        source: "type T implements { f: Int }",
        line: 1,
        column: 19,
        message: "Expected Name, found \"{\"."
      },
      {
        name: "union without members after the equals sign",
        source: "union U =",
        line: 1,
        column: 10,
        message: "Expected Name, found <EOF>."
      },
      { name: "empty schema block", source: "schema { }", line: 1, column: 10, message: "Expected Name, found \"}\"." },
      {
        name: "unknown operation type in a schema block",
        source: "schema { foo: Q }",
        line: 1,
        column: 10,
        message: "Unexpected Name \"foo\"."
      },
      {
        name: "variable in an input default",
        source: "input I { f: Int = $v }",
        line: 1,
        column: 20,
        message: "Unexpected variable \"$v\" in constant value."
      },
      {
        name: "reserved enum value name",
        source: "enum E { true }",
        line: 1,
        column: 10,
        message: "Name \"true\" is reserved and cannot be used for an enum value."
      },
      {
        name: "directive without locations",
        source: "directive @d on",
        line: 1,
        column: 16,
        message: "Expected Name, found <EOF>."
      },
      {
        name: "unknown directive location",
        source: "directive @d on FOO",
        line: 1,
        column: 17,
        message: "Unexpected Name \"FOO\"."
      },
      {
        name: "description on an extension",
        source: "\"desc\" extend type T { f: Int }",
        line: 1,
        column: 1,
        message: "Unexpected description, only GraphQL definitions support descriptions."
      }
    ]
    for (const testCase of cases) {
      it(testCase.name, () => {
        assertDiagnostic(testCase.source, { line: testCase.line, column: testCase.column, message: testCase.message })
      })
    }
  })

  describe("parseConstValue", () => {
    it("parses a const value that spans the whole source", () => {
      const result = parseConstValue(source("{a: [1, \"x\"], b: ENUM}", "defaultValue"))
      assert(Result.isSuccess(result))
      assert.deepStrictEqual(stripLoc(result.success), {
        _tag: "ObjectValue",
        fields: [
          {
            _tag: "ObjectField",
            name: name("a"),
            value: { _tag: "ListValue", values: [int("1"), str("x")] }
          },
          { _tag: "ObjectField", name: name("b"), value: { _tag: "EnumValue", value: "ENUM" } }
        ]
      })
    })

    it("rejects variables, trailing tokens and empty input", () => {
      assertDiagnostic(
        "$v",
        { line: 1, column: 1, message: "Unexpected variable \"$v\" in constant value." },
        parseConstValue
      )
      assertDiagnostic(
        "[1, $v]",
        { line: 1, column: 5, message: "Unexpected variable \"$v\" in constant value." },
        parseConstValue
      )
      assertDiagnostic("1 2", { line: 1, column: 3, message: "Expected <EOF>, found Int \"2\"." }, parseConstValue)
      assertDiagnostic("", { line: 1, column: 1, message: "Unexpected <EOF>." }, parseConstValue)
    })
  })
})
