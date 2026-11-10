import { CodeWriter } from "effect"
import { describe, it } from "vitest"
import { deepStrictEqual, strictEqual, throws } from "./utils/assert.ts"

describe("CodeWriter", () => {
  describe("imports", () => {
    it("prints only imports used by printed code", () => {
      const writer = CodeWriter.make()
      const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect")
      CodeWriter.importNamespace(writer, "effect/Stream", "Stream")
      CodeWriter.add(writer, CodeWriter.code`export const one = ${Effect}.succeed(1)`)
      strictEqual(
        CodeWriter.print(writer),
        `import * as Effect from "effect/Effect"\n\nexport const one = Effect.succeed(1)\n`
      )
    })

    it("imports as a type only when every printed use is type-only", () => {
      const cases: ReadonlyArray<readonly [ReadonlyArray<boolean>, string]> = [
        [[true], `import type * as Effect from "effect/Effect"`],
        [[true, false], `import * as Effect from "effect/Effect"`],
        [[false], `import * as Effect from "effect/Effect"`]
      ]
      for (const [uses, expected] of cases) {
        const writer = CodeWriter.make()
        for (const typeOnly of uses) {
          const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect", { typeOnly })
          CodeWriter.add(writer, CodeWriter.code`${Effect}`)
        }
        strictEqual(CodeWriter.print(writer).split("\n")[0], expected)
      }
    })

    it("groups named imports and sorts packages before relative modules", () => {
      const writer = CodeWriter.make()
      const b = CodeWriter.importNamed(writer, "./b.ts", "b")
      const HttpApi = CodeWriter.importNamed(writer, "effect/http-api", "HttpApi")
      const OpenApi = CodeWriter.importNamed(writer, "effect/http-api", "OpenApi")
      CodeWriter.add(writer, CodeWriter.code`${b}(${OpenApi}, ${HttpApi})`)
      strictEqual(
        CodeWriter.print(writer),
        `import { HttpApi, OpenApi } from "effect/http-api"\nimport { b } from "./b.ts"\n\nb(OpenApi, HttpApi)\n`
      )
    })
    it("marks type-only specifiers when a module has value and type-only uses", () => {
      const writer = CodeWriter.make()
      const some = CodeWriter.importNamed(writer, "effect/Option", "some")
      const Option = CodeWriter.importNamed(writer, "effect/Option", "Option", { typeOnly: true })
      const None = CodeWriter.importNamed(writer, "effect/Option", "None", { typeOnly: true })
      CodeWriter.add(writer, CodeWriter.code`${some}: ${Option} | ${None}`)
      strictEqual(
        CodeWriter.print(writer).split("\n")[0],
        `import { type None, type Option, some } from "effect/Option"`
      )
    })

    it("prints default imports, one per module", () => {
      const writer = CodeWriter.make({ reserved: ["ts"] })
      const ts = CodeWriter.importDefault(writer, "typescript", "ts")
      strictEqual(CodeWriter.importDefault(writer, "typescript", "typescript").name, "ts2")
      const Ajv = CodeWriter.importDefault(writer, "ajv", "Ajv", { typeOnly: true })
      const version = CodeWriter.importNamed(writer, "typescript", "version")
      CodeWriter.add(writer, CodeWriter.code`${ts}.${version}: ${Ajv}`)
      strictEqual(
        CodeWriter.print(writer),
        `import type Ajv from "ajv"\nimport ts2 from "typescript"\nimport { version } from "typescript"\n\nts2.version: Ajv\n`
      )
    })

    it("prints side-effect imports first, in the order they were added", () => {
      const writer = CodeWriter.make()
      const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect")
      CodeWriter.importSideEffect(writer, "./setup.ts")
      CodeWriter.importSideEffect(writer, "./polyfill.ts")
      CodeWriter.importSideEffect(writer, "./setup.ts")
      CodeWriter.add(writer, CodeWriter.code`${Effect}`)
      strictEqual(
        CodeWriter.print(writer),
        `import "./setup.ts"\nimport "./polyfill.ts"\nimport * as Effect from "effect/Effect"\n\nEffect\n`
      )
    })
  })

  describe("exports", () => {
    it("prints re-exports after the imports, grouped per module", () => {
      const writer = CodeWriter.make()
      const Schema = CodeWriter.importNamespace(writer, "effect/Schema", "Schema")
      CodeWriter.reexport(writer, "./User.ts", "User")
      CodeWriter.reexport(writer, "./User.ts", "UserId", { typeOnly: true })
      CodeWriter.reexport(writer, "./Order.ts", "Order", { typeOnly: true })
      CodeWriter.reexport(writer, "./Order.ts", "Order") // a value request makes it a value export
      CodeWriter.reexport(writer, "./Pet.ts", "Pet", { typeOnly: true })
      CodeWriter.reexportAll(writer, "./all.ts")
      CodeWriter.reexportAll(writer, "./types.ts", { typeOnly: true })
      strictEqual(CodeWriter.reexportAll(writer, "./Order.ts", { as: "Orders" }), "Orders")
      CodeWriter.add(writer, CodeWriter.code`export const Id = ${Schema}.String`)
      strictEqual(
        CodeWriter.print(writer),
        [
          `import * as Schema from "effect/Schema"`,
          ``,
          `export * from "./all.ts"`,
          `export * as Orders from "./Order.ts"`,
          `export { Order } from "./Order.ts"`,
          `export type { Pet } from "./Pet.ts"`,
          `export type * from "./types.ts"`,
          `export { User, type UserId } from "./User.ts"`,
          ``,
          `export const Id = Schema.String`,
          ``
        ].join("\n")
      )
    })

    it("takes exported names in the module and lists them", () => {
      const writer = CodeWriter.make()
      const User = CodeWriter.declare(writer, "User", { exported: true })
      CodeWriter.declare(writer, "helper")
      CodeWriter.declare(CodeWriter.scope(writer), "local")
      strictEqual(CodeWriter.reexport(writer, "./other.ts", "User"), "User2")
      strictEqual(CodeWriter.reexport(writer, "./other.ts", "User"), "User2")
      strictEqual(CodeWriter.reexport(writer, "./other.ts", "User", { as: "OtherUser" }), "OtherUser")
      deepStrictEqual(CodeWriter.exportedNames(writer), [User.name, "User2", "OtherUser"])
      deepStrictEqual(CodeWriter.renames(writer).map((r) => [r.wanted, r.name]), [["User", "User2"]])
      strictEqual(
        CodeWriter.print(writer),
        `export { User as OtherUser, User as User2 } from "./other.ts"\n`
      )
    })
  })

  describe("names", () => {
    it("suffixes imports and declarations whose name is taken, and reports declarations", () => {
      const writer = CodeWriter.make({ reserved: ["Effect"] })
      strictEqual(CodeWriter.importNamespace(writer, "effect/Effect", "Effect").name, "Effect2")
      strictEqual(CodeWriter.importNamespace(writer, "effect/Effect", "Effect").name, "Effect2")
      strictEqual(CodeWriter.declare(writer, "make").name, "make")
      strictEqual(CodeWriter.declare(writer, "make").name, "make2")
      strictEqual(CodeWriter.declare(writer, "class").name, "class2")
      deepStrictEqual(CodeWriter.renames(writer).map((r) => [r.wanted, r.name]), [["make", "make2"], [
        "class",
        "class2"
      ]])
    })

    it("turns input into local identifiers", () => {
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["id", "id"],
        ["default", "default_"],
        ["user-id", "user_id"],
        ["1st", "_1st"],
        ["", "_"]
      ]
      for (const [input, expected] of cases) strictEqual(CodeWriter.identifier(input), expected)
    })
  })

  describe("scopes", () => {
    it("never shadows along the scope chain, and lets sibling scopes reuse names", () => {
      const writer = CodeWriter.make()
      const outer = CodeWriter.scope(writer)
      const inner = CodeWriter.scope(outer)
      const sibling = CodeWriter.scope(writer)
      const cases: ReadonlyArray<readonly [CodeWriter.CodeWriter | CodeWriter.CodeScope, string, string]> = [
        [inner, "x", "x"], // first use
        [outer, "x", "x2"], // an outer name avoids names of nested scopes
        [writer, "x", "x3"], // so does a module name
        [sibling, "x", "x"], // only the module's x3 is in this chain; the other branch's names are not
        [inner, "y", "y"],
        [sibling, "y", "y"] // siblings reuse names
      ]
      for (const [owner, wanted, expected] of cases) strictEqual(CodeWriter.declare(owner, wanted).name, expected)
    })

    it("nests without limit", () => {
      const writer = CodeWriter.make()
      let scope: CodeWriter.CodeWriter | CodeWriter.CodeScope = writer
      const names: Array<string> = []
      for (let i = 0; i < 5; i++) {
        scope = CodeWriter.scope(scope)
        names.push(CodeWriter.declare(scope, "a").name)
      }
      deepStrictEqual(names, ["a", "a2", "a3", "a4", "a5"])
    })
  })

  describe("fragments", () => {
    it("joins and indents fragments", () => {
      const writer = CodeWriter.make()
      const lines = ["a: 1", "b: 2"]
      CodeWriter.add(
        writer,
        CodeWriter.code`const x = {${CodeWriter.indent(CodeWriter.code`\n${CodeWriter.join(lines, ",\n")}`)}\n}`
      )
      strictEqual(CodeWriter.print(writer), `const x = {\n  a: 1,\n  b: 2\n}\n`)
    })

    it("refuses to become a plain string, so imports cannot go missing", () => {
      const writer = CodeWriter.make()
      const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect")
      throws(() => `${Effect}`)
      throws(() => `${CodeWriter.code`${Effect}`}`)
    })
  })
})
