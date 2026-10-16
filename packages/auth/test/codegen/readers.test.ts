import { assert, describe, it } from "@effect/vitest"
import * as Readers from "../../codegen/readers.ts"

describe("provider source readers", () => {
  it("resolves OpenAPI inheritance, nullable fields and newly added nested fields", () => {
    const source = {
      base: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] },
      detail: { type: "object", properties: { new_field: { type: "boolean" } } },
      profile: {
        allOf: [
          { $ref: "https://provider.example/schema.json#/base" },
          {
            type: "object",
            properties: {
              detail: { $ref: "#/detail", description: "Profile details" },
              label: { type: "string", nullable: true }
            }
          }
        ]
      }
    }
    assert.deepStrictEqual(Readers.openApi(source, ["profile"], "https://provider.example/schema.json"), {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        detail: { type: "object", properties: { new_field: { type: "boolean" } } },
        label: { anyOf: [{ type: "string" }, { type: "null" }] }
      }
    })
  })

  it("rejects unpinned, missing and recursive OpenAPI references", () => {
    for (const $ref of ["other.json#/model", "#/missing", "#/model"]) {
      assert.throws(() => Readers.openApi({ model: { $ref } }, ["model"], "https://provider.example/schema.json"))
    }
    assert.throws(() =>
      Readers.openApi(
        { model: { type: "object", additionalProperties: { $ref: "other.json#/model" } } },
        ["model"],
        "https://provider.example/schema.json"
      )
    )
  })

  it("rejects constraints beside OpenAPI references rather than ignoring them", () => {
    const source = {
      name: { type: "string" },
      profile: { $ref: "#/name", minLength: 1 }
    }
    assert.throws(() => Readers.openApi(source, ["profile"], "https://provider.example/schema.json"))
  })

  it("rejects conflicting OpenAPI fields instead of choosing an intersection branch", () => {
    const source = {
      profile: {
        allOf: [
          { type: "object", properties: { id: { type: "string" } } },
          { type: "object", properties: { id: { type: "number" } } }
        ]
      }
    }
    assert.throws(() => Readers.openApi(source, ["profile"], "https://provider.example/schema.json"))
  })

  it("reads SDK imports, namespaces, inheritance, unions and optional fields without executing code", () => {
    const read = Readers.typescript({
      "/profile.ts": `namespace users {
        interface Base { id: string; }
        export interface Profile extends Base {
          name?: string | null;
          added: { active: boolean; roles: Array<"reader" | "writer"> };
        } }
        throw new Error("upstream code must not execute")`
    })
    assert.deepStrictEqual(read("/profile.ts", "users.Profile"), {
      type: "object",
      required: ["id", "added"],
      properties: {
        id: { type: "string" },
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        added: {
          type: "object",
          required: ["active", "roles"],
          properties: {
            active: { type: "boolean" },
            roles: {
              type: "array",
              items: {
                anyOf: [
                  { type: "string", const: "reader" },
                  { type: "string", const: "writer" }
                ]
              }
            }
          }
        }
      }
    })
    const imported = Readers.typescript({
      "/common.ts": "export interface Result { ok: true; '__proto__': string; }",
      "/nested/response.ts":
        "import { Result as Base } from '../common.js'; export type Response = Base & { 'https://provider.example/id': string };"
    })
    assert.deepStrictEqual(imported("/nested/response.ts", "Response"), {
      type: "object",
      required: ["ok", "__proto__", "https://provider.example/id"],
      properties: {
        ok: { type: "boolean", const: true },
        ["__proto__"]: { type: "string" },
        "https://provider.example/id": { type: "string" }
      }
    })
  })

  it("fails on unsupported and recursive SDK types instead of generating a weaker schema", () => {
    for (
      const type of [
        "Partial<{ id: string }>",
        "Missing",
        "{ child: Profile }",
        "{ id: string } & (string | number)",
        "{ id: string } & { id: number }"
      ]
    ) {
      const read = Readers.typescript({ "/profile.ts": `export type Profile = ${type}` })
      assert.throws(() => read("/profile.ts", "Profile"))
    }
  })

  it("derives the OpenID claim inventory and address fields from the specification", () => {
    const xml = `<texttable anchor="ClaimTable">
      <ttcol>Claim</ttcol><ttcol>Type</ttcol><ttcol>Description</ttcol>
      <c>sub</c><c>string</c><c>Subject</c>
      <c>new_claim</c><c>boolean</c><c>A <spanx>new</spanx> claim</c>
      <c>address</c><c>JSON object</c><c>Address</c>
    </texttable><section anchor="AddressClaim"><t><list>
      <t hangText="new_address_field">New address component</t>
    </list></t></section>`
    assert.deepStrictEqual(Readers.openId(xml), {
      type: "object",
      properties: {
        sub: { type: "string" },
        new_claim: { type: "boolean" },
        address: { type: "object", properties: { new_address_field: { type: "string" } } }
      }
    })
    assert.throws(() => Readers.openId(xml.replace("<c>boolean</c>", "<c>unknown</c>")))
    assert.throws(() => Readers.openId("<rfc/>"))
  })
})
