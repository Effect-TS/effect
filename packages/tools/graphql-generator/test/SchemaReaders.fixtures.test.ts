/**
 * Schema model features the GitHub fixtures lack, one hand-written SDL fixture
 * each under `test/fixtures/sdl/`, plus the newer introspection keys read from
 * `test/fixtures/introspection/modern.json`.
 */
import * as IntrospectionReader from "@effect/graphql-generator/internal/IntrospectionReader"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { source } from "./utils/ast.ts"
import {
  assertModelsEqual,
  directiveDefinition,
  enumType,
  enumValue,
  field,
  fixture,
  inputObjectType,
  inputValue,
  interfaceType,
  list,
  named,
  nonNull,
  objectType,
  readIntrospection,
  readSdl,
  scalarType,
  schema,
  unionType
} from "./utils/model.ts"

const readSdlFixture = (name: string) => readSdl(fixture(`sdl/${name}.graphql`), `sdl/${name}.graphql`)

describe("SdlReader: hand-written fixtures", () => {
  it("@oneOf marks an input object", () => {
    assertModelsEqual(
      readSdlFixture("one-of"),
      schema({
        queryType: "Query",
        types: [
          objectType("Query", [
            field("pet", named("String"), { arguments: [inputValue("by", nonNull(named("PetBy")))] }),
            field("pets", list(nonNull(named("String"))), { arguments: [inputValue("filter", named("PetFilter"))] })
          ]),
          inputObjectType("PetBy", [inputValue("id", named("ID")), inputValue("name", named("String"))], {
            description: "Exactly one way to identify a pet.",
            oneOf: true
          }),
          inputObjectType("PetFilter", [inputValue("species", named("String"))])
        ]
      })
    )
  })

  it("@specifiedBy records the scalar's URL", () => {
    assertModelsEqual(
      readSdlFixture("specified-by"),
      schema({
        queryType: "Query",
        types: [
          objectType("Query", [
            field("now", nonNull(named("DateTime"))),
            field("token", named("Opaque"))
          ]),
          scalarType("DateTime", {
            description: "An RFC 3339 timestamp.",
            specifiedBy: "https://datatracker.ietf.org/doc/html/rfc3339"
          }),
          scalarType("Opaque")
        ]
      })
    )
  })

  it("arguments and input fields carry deprecation reasons, defaulting when none is given", () => {
    assertModelsEqual(
      readSdlFixture("input-deprecation"),
      schema({
        queryType: "Query",
        types: [
          objectType("Query", [
            field("search", nonNull(list(nonNull(named("String")))), {
              arguments: [
                inputValue("term", named("String")),
                inputValue("query", named("String"), { deprecationReason: "Use `term`." }),
                inputValue("limit", named("Int"), {
                  defaultValue: { _tag: "IntValue", value: "10" },
                  deprecationReason: "No longer supported"
                }),
                inputValue("filter", named("SearchFilter"))
              ]
            })
          ]),
          inputObjectType("SearchFilter", [
            inputValue("kind", named("String")),
            inputValue("legacyKind", named("String"), { deprecationReason: "Use `kind`." })
          ])
        ]
      })
    )
  })

  it("directive definitions keep repeatable, arguments and locations; applied directives are dropped", () => {
    assertModelsEqual(
      readSdlFixture("repeatable-directives"),
      schema({
        queryType: "Query",
        types: [
          enumType("Role", [enumValue("ADMIN"), enumValue("USER")]),
          objectType("Query", [field("secret", named("String"))])
        ],
        directives: [
          directiveDefinition("tag", ["OBJECT", "FIELD_DEFINITION"], {
            description: "Tags a definition for documentation tooling.",
            arguments: [inputValue("name", nonNull(named("String")))],
            repeatable: true
          }),
          directiveDefinition("auth", ["FIELD_DEFINITION"], {
            arguments: [
              inputValue("role", named("Role"), { defaultValue: { _tag: "EnumValue", value: "ADMIN" } }),
              inputValue("scopes", list(nonNull(named("String"))), {
                defaultValue: { _tag: "ListValue", values: [{ _tag: "StringValue", value: "read" }] }
              })
            ]
          })
        ]
      })
    )
  })

  it("a type named Subscription is the subscription root when there is no schema definition", () => {
    assertModelsEqual(
      readSdlFixture("subscription-root"),
      schema({
        queryType: "Query",
        subscriptionType: "Subscription",
        types: [
          objectType("Query", [field("ping", named("Boolean"))]),
          objectType("Subscription", [
            field("messageAdded", nonNull(named("Message")), {
              description: "Emits each new message in a room.",
              arguments: [inputValue("room", nonNull(named("ID")))]
            })
          ]),
          objectType("Message", [field("body", nonNull(named("String")))])
        ]
      })
    )
  })

  it("merges every extend form into its definition in document order", () => {
    assertModelsEqual(
      readSdlFixture("extensions"),
      schema({
        queryType: "Root",
        mutationType: "Changes",
        types: [
          objectType("Root", [
            field("a", named("String")),
            field("items", nonNull(list(nonNull(named("Item")))), {
              arguments: [inputValue("filter", named("Filter"))]
            }),
            field("node", named("Node"), { arguments: [inputValue("id", nonNull(named("ID")))] })
          ]),
          interfaceType("Node", [field("id", nonNull(named("ID"))), field("title", named("String"))], {
            possibleTypes: ["Film"]
          }),
          objectType("Book", [field("title", named("String"))]),
          objectType("Film", [field("title", named("String")), field("id", nonNull(named("ID")))], {
            interfaces: ["Node"]
          }),
          unionType("Item", ["Book", "Film"]),
          enumType("Genre", [enumValue("DRAMA"), enumValue("COMEDY")]),
          inputObjectType("Filter", [inputValue("genre", named("Genre")), inputValue("title", named("String"))]),
          scalarType("Url", { specifiedBy: "https://url.spec.whatwg.org/" }),
          objectType("Changes", [
            field("rename", named("Film"), { arguments: [inputValue("title", nonNull(named("String")))] })
          ])
        ]
      })
    )
  })
})

describe("IntrospectionReader: newer introspection keys", () => {
  it("isOneOf, specifiedByURL, isRepeatable and input value deprecation match the SDL they came from", () => {
    // modern.json is graphql-js introspection of modern.graphql with every optional key enabled.
    assertModelsEqual(
      readIntrospection(fixture("introspection/modern.json"), "introspection/modern.json"),
      readSdl(fixture("introspection/modern.graphql"), "introspection/modern.graphql")
    )
  })

  it("rejects JSON with neither the { __schema } nor the { data: { __schema } } shape", () => {
    const result = IntrospectionReader.read(source("{\"schema\":{}}", "bad.json"))
    assert(Result.isFailure(result), "expected a diagnostic")
    assert.strictEqual(result.failure._tag, "Diagnostic")
    assert.strictEqual(result.failure.path, "bad.json")
  })
})
