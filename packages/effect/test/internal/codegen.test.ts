import { assert, describe, it } from "@effect/vitest"
import {
  code,
  deferred,
  docComment,
  importDefault,
  importNamed,
  importNamespace,
  indent,
  join,
  literal,
  Module,
  propertyKey
} from "effect/internal/codegen"

describe("module code generation", () => {
  it("resolves bindings and dependency order without changing literal text", () => {
    const module = new Module()
    const child = module.declare("Option")
    const parent = module.declare("await")
    assert.throws(() => String(child), "Code fragments must be rendered by their module")
    const imported = module.addImport({
      module: "effect/Option",
      kind: "Namespace",
      imported: "*",
      local: "Option",
      typeOnly: false,
      attributes: ""
    })
    module.define(parent, [code`const ${parent} = ${imported}.some(${child})`], [child, imported])
    module.define(child, [code`const ${child} = { Option: "Option" }`])
    const output = module.finalize([parent])
    assert.deepStrictEqual(output.declarations.map((declaration) => declaration.fragments), [
      ["const Option = { Option: \"Option\" }"],
      ["const await1 = Option1.some(Option)"]
    ])
    assert.deepStrictEqual(output.roots, ["await1"])
  })

  it("renders shared fragments once per finalization", () => {
    const module = new Module()
    let calls = 0
    const shared = deferred(() => {
      calls++
      return "value"
    })
    let fragment = shared
    for (let i = 0; i < 12; i++) fragment = code`${fragment}${fragment}`
    assert.strictEqual(module.finalize([fragment]).roots[0], "value".repeat(4096))
    assert.strictEqual(calls, 1)
    assert.strictEqual(module.finalize([fragment]).roots[0], "value".repeat(4096))
    assert.strictEqual(calls, 2)
  })

  it("rejects eager cycles and distinguishes imports requesting the same name", () => {
    const module = new Module()
    const a = module.declare("A")
    const b = module.declare("B")
    module.define(a, [b], [b])
    module.define(b, [a], [a])
    assert.throws(() => module.finalize([]), "Cyclic initialization dependency")

    const input = {
      module: "one",
      kind: "Namespace" as const,
      imported: "*",
      local: "Value",
      typeOnly: false,
      attributes: ""
    }
    const imports = new Module()
    const first = imports.addImport(input)
    assert.strictEqual(first, imports.addImport(input))
    const second = imports.addImport({ ...input, module: "two" })
    const output = imports.finalize([code`${first}.value + ${second}.value`])
    assert.deepStrictEqual(output.roots, ["Value.value + Value1.value"])
    assert.deepStrictEqual(output.imports, ["import * as Value from \"one\"", "import * as Value1 from \"two\""])
  })

  it("shares import symbols across modules and prints without mutating names", () => {
    const Effect = importNamespace("effect/Effect", "Effect")
    assert.throws(() => String(Effect), "Code fragments must be rendered by their module")
    for (const collision of [true, false]) {
      const module = new Module()
      if (collision) module.declare("Effect", { exact: true })
      module.add(code`export const one = ${Effect}.succeed(1)`)
      const name = collision ? "Effect1" : "Effect"
      const expected = `import * as ${name} from "effect/Effect"\n\nexport const one = ${name}.succeed(1)\n`
      assert.strictEqual(module.print(), expected)
      assert.strictEqual(module.print(), expected)
    }
    const first = new Module()
    const local = first.declare("Local")
    assert.throws(() => new Module().finalize([local]), "Binding belongs to another module")
  })

  it("emits only used imports, groups named imports, and promotes type imports", () => {
    const module = new Module()
    module.addSideEffect("./setup.ts")
    module.addSideEffect("./setup.ts")
    module.addImport({
      module: "unused",
      kind: "Namespace",
      imported: "*",
      local: "Unused",
      typeOnly: false,
      attributes: ""
    })
    const type = importNamed("effect/Option", "Option", { typeOnly: true })
    const some = importNamed("effect/Option", "some")
    const EffectType = importNamespace("effect/Effect", "Effect", { typeOnly: true })
    const EffectValue = importNamespace("effect/Effect", "OtherName")
    const defaultType = importDefault("example", "Example", { typeOnly: true })
    const output = module.finalize([code`${type} ${some} ${EffectType} ${EffectValue} ${defaultType}`])
    assert.deepStrictEqual(output.imports, [
      "import \"./setup.ts\"",
      "import { type Option, some } from \"effect/Option\"",
      "import * as Effect from \"effect/Effect\"",
      "import type Example from \"example\""
    ])
    assert.deepStrictEqual(output.roots, ["Option some Effect Effect Example"])
  })

  it("keeps exact names and prevents shadowing along nested scopes", () => {
    const module = new Module(["Client"])
    const outer = module.scope()
    const inner = module.scope(outer)
    const sibling = module.scope()
    const bindings = [
      module.declare("x", { scope: inner }),
      module.declare("x", { scope: outer }),
      module.declare("x"),
      module.declare("x", { scope: sibling }),
      module.declare("user-id"),
      module.declare("globalThis")
    ]
    assert.deepStrictEqual(module.finalize(bindings).roots, ["x", "x1", "x2", "x", "user_id", "globalThis1"])
    for (const name of ["Client", "x", "default", "invalid-name"]) {
      assert.throws(() => module.declare(name, { exact: true }), "Cannot declare exact name")
    }
    const name = module.declare("invalid_name", { exact: true })
    assert.strictEqual(name.name, "invalid_name")
    assert.deepStrictEqual(module.finalize([name]).roots, ["invalid_name"])
  })

  it("formats literals, keys, documentation, and indented fragments", () => {
    assert.deepStrictEqual(["a\"b", -0, NaN, Infinity, -Infinity, -12n, true, null, undefined].map(literal), [
      "\"a\\\"b\"",
      "-0",
      "globalThis.NaN",
      "globalThis.Infinity",
      "-globalThis.Infinity",
      "-12n",
      "true",
      "null",
      "undefined"
    ])
    assert.deepStrictEqual(["default", "$é", "user-id", "__proto__"].map(propertyKey), [
      "default",
      "$é",
      "\"user-id\"",
      "[\"__proto__\"]"
    ])
    assert.strictEqual(docComment("one */"), "/** one *\\/ */\n")
    assert.strictEqual(docComment(" \n"), "")
    const module = new Module()
    assert.deepStrictEqual(module.finalize([code`values ${[1, null, undefined, false, ["ok"]]}`]).roots, ["values 1ok"])
    const fields = join([code`${docComment(["A user.", "", "Has an id."])}id: string`, "age: number"], "\n")
    module.add(code`interface User {${indent(code`\n${fields}`)}\n}`)
    assert.strictEqual(
      module.print(),
      "interface User {\n  /**\n   * A user.\n   *\n   * Has an id.\n   */\n  id: string\n  age: number\n}\n"
    )
    assert.throws(() => String(fields), "Code fragments must be rendered by their module")
  })
})
