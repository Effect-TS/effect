import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { CodeWriter } from "effect"

const Effect = CodeWriter.importNamespace("effect/Effect", "Effect")

describe("CodeWriter", () => {
  it("shares import symbols between writers", () => {
    for (const name of ["one", "two"]) {
      const writer = CodeWriter.make()
      CodeWriter.add(writer, CodeWriter.code`export const ${name} = ${Effect}.succeed(1)`)
      strictEqual(
        CodeWriter.print(writer),
        `import * as Effect from "effect/Effect"\n\nexport const ${name} = Effect.succeed(1)\n`
      )
    }
  })

  it("groups, sorts and type-qualifies imports", () => {
    const writer = CodeWriter.make()
    CodeWriter.importSideEffect(writer, "./setup.ts")
    CodeWriter.importSideEffect(writer, "./a\"b.ts")
    CodeWriter.importSideEffect(writer, "./setup.ts")
    const b = CodeWriter.importNamed("./b.ts", "b")
    const some = CodeWriter.importNamed("effect/Option", "some")
    const Option = CodeWriter.importNamed("effect/Option", "Option", { typeOnly: true })
    const Types = CodeWriter.importNamespace("effect/Types", "Types", { typeOnly: true })
    const EffectType = CodeWriter.importNamespace("effect/Effect", "Effect", { typeOnly: true })
    const ts = CodeWriter.importDefault("typescript", "ts")
    const Ajv = CodeWriter.importDefault("ajv", "Ajv", { typeOnly: true })
    const C = CodeWriter.importNamed("./c.ts", "C", { typeOnly: true })
    const cd = CodeWriter.importNamed("./c.ts", "c-d", { typeOnly: true })
    CodeWriter.add(writer, CodeWriter.code`${b}(${some}, ${ts}): ${Option} | ${Types} | ${Ajv} | ${EffectType}`)
    CodeWriter.add(writer, CodeWriter.code`${C} | ${cd}`)
    CodeWriter.add(writer, CodeWriter.code`${Effect}`)
    strictEqual(
      CodeWriter.print(writer),
      [
        `import "./setup.ts"`,
        `import "./a\\"b.ts"`,
        `import type Ajv from "ajv"`,
        `import * as Effect from "effect/Effect"`,
        `import { type Option, some } from "effect/Option"`,
        `import type * as Types from "effect/Types"`,
        `import ts from "typescript"`,
        `import { b } from "./b.ts"`,
        `import type { C, "c-d" as c_d } from "./c.ts"`,
        ``,
        `b(some, ts): Option | Types | Ajv | Effect`,
        ``,
        `C | c_d`,
        ``,
        `Effect`,
        ``
      ].join("\n")
    )
  })

  it("names used imports after every declaration, including nested ones", () => {
    const writer = CodeWriter.make({ reserved: ["ts"] })
    const local = CodeWriter.declare(CodeWriter.scope(writer), "some")
    const some = CodeWriter.importNamed("effect/Option", "some")
    const ts = CodeWriter.importDefault("typescript", "ts")
    CodeWriter.add(writer, CodeWriter.code`${Effect} ${some} ${ts} ${local}`)
    CodeWriter.add(CodeWriter.make(), CodeWriter.code`${CodeWriter.importNamespace("effect/Stream", "Stream")}`) // used elsewhere only
    CodeWriter.add(
      writer,
      CodeWriter.code`${CodeWriter.declare(writer, "Effect")} ${CodeWriter.declare(writer, "Stream")}`
    )
    strictEqual(
      CodeWriter.print(writer),
      [
        `import * as Effect2 from "effect/Effect"`,
        `import { some as some2 } from "effect/Option"`,
        `import ts2 from "typescript"`,
        ``,
        `Effect2 some2 ts2 some`,
        ``,
        `Effect Stream`,
        ``
      ].join("\n")
    )
  })

  it("declares valid identifiers that never shadow along the scope chain", () => {
    const writer = CodeWriter.make()
    const outer = CodeWriter.scope(writer)
    const inner = CodeWriter.scope(outer)
    const sibling = CodeWriter.scope(writer)
    const declared = [
      [inner, "x"],
      [outer, "x"],
      [writer, "x"],
      [sibling, "x"],
      [inner, "y"],
      [sibling, "y"],
      [writer, "user-id"],
      [writer, "1st"],
      [writer, ""],
      [writer, "default"],
      [writer, "globalThis"]
    ] as const
    deepStrictEqual(
      declared.map(([owner, name]) => CodeWriter.declare(owner, name).name),
      ["x", "x2", "x3", "x", "y", "y", "user_id", "_1st", "_", "default2", "globalThis2"]
    )
  })

  it("declares exact names or throws without taking a name", () => {
    const writer = CodeWriter.make({ reserved: ["Client"] })
    const scope = CodeWriter.scope(writer)
    CodeWriter.declare(writer, "make", { exact: true })
    CodeWriter.declare(scope, "id", { exact: true })
    const failures = [
      [writer, "user-id", "it is not an identifier"],
      [writer, "default", "it is a reserved word"],
      [writer, "Client", "it is reserved by CodeWriter.make"],
      [writer, "make", "this scope declares it"],
      [writer, "id", "a nested scope declares it"],
      [scope, "make", "an enclosing scope declares it"]
    ] as const
    for (const [owner, name, reason] of failures) {
      throws(() => CodeWriter.declare(owner, name, { exact: true }), new Error(`Cannot declare "${name}": ${reason}`))
    }
    throws(() => CodeWriter.declare(CodeWriter.scope(scope), "x-y", { exact: true }))
    deepStrictEqual(
      [CodeWriter.declare(writer, "user_id", { exact: true }), CodeWriter.declare(writer, "make")].map((d) => d.name),
      ["user_id", "make2"]
    )
    const Client = CodeWriter.importNamespace("./Client.ts", "Client")
    const xy = CodeWriter.importNamed("./x.ts", "x_y")
    CodeWriter.add(writer, CodeWriter.code`${Client} ${xy}`)
    strictEqual(
      CodeWriter.print(writer),
      `import * as Client2 from "./Client.ts"\nimport { x_y } from "./x.ts"\n\nClient2 x_y\n`
    )
  })

  it("formats literals, property keys and doc comments", () => {
    deepStrictEqual(
      ["a\"b", 1.5, -0, NaN, Infinity, -Infinity, -12n, true, false, null, undefined].map(CodeWriter.literal),
      [
        `"a\\"b"`,
        "1.5",
        "-0",
        "globalThis.NaN",
        "globalThis.Infinity",
        "-globalThis.Infinity",
        "-12n",
        "true",
        "false",
        "null",
        "undefined"
      ]
    )
    deepStrictEqual(
      ["id", "default", "$é_1", "user-id", "1a", "", "__proto__"].map(CodeWriter.propertyKey),
      ["id", "default", "$é_1", `"user-id"`, `"1a"`, `""`, `["__proto__"]`]
    )
    deepStrictEqual(
      [" \none */ ", [], "\n \n"].map(CodeWriter.docComment),
      ["/** one *\\/ */\n", "", ""]
    )
    const writer = CodeWriter.make()
    const doc = CodeWriter.docComment(["\nA user.  ", "", "Has an id.\r\n"])
    CodeWriter.add(
      writer,
      CodeWriter.code`interface User {${CodeWriter.indent(CodeWriter.code`\n${doc}id: string`)}\n}`
    )
    strictEqual(
      CodeWriter.print(writer),
      `interface User {\n  /**\n   * A user.\n   *\n   * Has an id.\n   */\n  id: string\n}\n`
    )
  })

  it("joins and indents fragments", () => {
    const writer = CodeWriter.make()
    const fields = CodeWriter.join(["a: 1", CodeWriter.code`b: {${CodeWriter.indent("\nc: 2")}\n}`], ",\n")
    CodeWriter.add(writer, CodeWriter.code`const x = {${CodeWriter.indent(CodeWriter.code`\n\n${fields}`)}\n}`)
    strictEqual(CodeWriter.print(writer), `const x = {\n\n  a: 1,\n  b: {\n    c: 2\n  }\n}\n`)
  })

  it("rejects symbols outside the code template and declarations of another writer", () => {
    const writer = CodeWriter.make()
    const other = CodeWriter.declare(CodeWriter.make(), "other")
    throws(() => `${Effect}`)
    throws(() => `${other}`)
    throws(() => `${CodeWriter.code`${Effect}`}`)
    CodeWriter.add(writer, CodeWriter.code`${other}`)
    throws(() => CodeWriter.print(writer))
  })
})
