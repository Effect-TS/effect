import { assert, describe, it } from "@effect/vitest"
import {
  add,
  addImport,
  addSideEffect,
  code,
  declare,
  deferred,
  define,
  docComment,
  finalize,
  importDefault,
  importNamed,
  importNamespace,
  indent,
  join,
  literal,
  make,
  print,
  propertyKey,
  scope
} from "effect/internal/codegen"

describe("module code generation", () => {
  it("keeps independently created modules isolated", () => {
    const first = make()
    const second = make()
    const a = declare(first, "A")
    const b = declare(second, "A")
    define(first, a, [code`const ${a} = 1`])
    define(second, b, [code`const ${b} = 2`])

    assert.strictEqual(print(first), "const A = 1\n")
    assert.strictEqual(print(second), "const A = 2\n")
    assert.throws(() => define(second, a, ["1"]), "Expected a declaration binding owned by this module")
    assert.throws(() => declare(second, "x", { scope: scope(first) }), "Scope belongs to another module")
  })

  it("can keep accumulating after finalization without changing previous output", () => {
    const module = make()
    const tools = importNamespace("tools", "Tools")
    add(module, code`use(${tools}.value)`)
    const first = finalize(module)

    const local = declare(module, "Tools")
    define(module, local, [code`const ${local} = 1`])
    const second = finalize(module)

    assert.deepStrictEqual(first.imports, ["import * as Tools from \"tools\""])
    assert.deepStrictEqual(first.body, ["use(Tools.value)"])
    assert.deepStrictEqual(first.declarations, [])
    assert.isFalse(first.names.has(local))
    assert.strictEqual(first.names.get(tools), "Tools")
    assert.deepStrictEqual(second.imports, ["import * as Tools1 from \"tools\""])
    assert.deepStrictEqual(second.body, ["use(Tools1.value)"])
    assert.deepStrictEqual(second.declarations.map((declaration) => declaration.fragments), [["const Tools = 1"]])
    assert.strictEqual(second.names.get(tools), "Tools1")
  })

  it("resolves bindings and dependency order without changing literal text", () => {
    const module = make()
    const child = declare(module, "Option")
    const parent = declare(module, "await")
    assert.throws(() => String(child), "Code fragments must be rendered by their module")
    const imported = addImport(module, {
      module: "effect/Option",
      kind: "Namespace",
      imported: "*",
      local: "Option",
      typeOnly: false,
      attributes: ""
    })
    define(module, parent, [code`const ${parent} = ${imported}.some(${child})`], [child, imported])
    define(module, child, [code`const ${child} = { Option: "Option" }`])
    const output = finalize(module, [parent])
    assert.deepStrictEqual(output.declarations.map((declaration) => declaration.fragments), [
      ["const Option = { Option: \"Option\" }"],
      ["const await1 = Option1.some(Option)"]
    ])
    assert.deepStrictEqual(output.roots, ["await1"])
  })

  it("renders shared fragments once per finalization", () => {
    const module = make()
    let calls = 0
    const shared = deferred(() => {
      calls++
      return "value"
    })
    let fragment = shared
    for (let i = 0; i < 12; i++) fragment = code`${fragment}${fragment}`
    assert.strictEqual(finalize(module, [fragment]).roots[0], "value".repeat(4096))
    assert.strictEqual(calls, 1)
    assert.strictEqual(finalize(module, [fragment]).roots[0], "value".repeat(4096))
    assert.strictEqual(calls, 2)
  })

  it("rejects eager cycles and distinguishes imports requesting the same name", () => {
    const module = make()
    const a = declare(module, "A")
    const b = declare(module, "B")
    define(module, a, [b], [b])
    define(module, b, [a], [a])
    assert.throws(() => finalize(module, []), "Cyclic initialization dependency")

    const input = {
      module: "one",
      kind: "Namespace" as const,
      imported: "*",
      local: "Value",
      typeOnly: false,
      attributes: ""
    }
    const imports = make()
    const first = addImport(imports, input)
    assert.strictEqual(first, addImport(imports, input))
    const second = addImport(imports, { ...input, module: "two" })
    const output = finalize(imports, [code`${first}.value + ${second}.value`])
    assert.deepStrictEqual(output.roots, ["Value.value + Value1.value"])
    assert.deepStrictEqual(output.imports, ["import * as Value from \"one\"", "import * as Value1 from \"two\""])
  })

  it("shares import symbols across modules and prints without mutating names", () => {
    const Effect = importNamespace("effect/Effect", "Effect")
    assert.throws(() => String(Effect), "Code fragments must be rendered by their module")
    for (const collision of [true, false]) {
      const module = make()
      if (collision) declare(module, "Effect", { exact: true })
      add(module, code`export const one = ${Effect}.succeed(1)`)
      const name = collision ? "Effect1" : "Effect"
      const expected = `import * as ${name} from "effect/Effect"\n\nexport const one = ${name}.succeed(1)\n`
      assert.strictEqual(print(module), expected)
      assert.strictEqual(print(module), expected)
    }
    const first = make()
    const local = declare(first, "Local")
    assert.throws(() => finalize(make(), [local]), "Binding belongs to another module")
  })

  it("emits only used imports, groups named imports, and promotes type imports", () => {
    const module = make()
    addSideEffect(module, "./setup.ts")
    addSideEffect(module, "./setup.ts")
    addImport(module, {
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
    const output = finalize(module, [code`${type} ${some} ${EffectType} ${EffectValue} ${defaultType}`])
    assert.deepStrictEqual(output.imports, [
      "import \"./setup.ts\"",
      "import { type Option, some } from \"effect/Option\"",
      "import * as Effect from \"effect/Effect\"",
      "import type Example from \"example\""
    ])
    assert.deepStrictEqual(output.roots, ["Option some Effect Effect Example"])
  })

  it("keeps exact names and prevents shadowing along nested scopes", () => {
    const module = make(["Client"])
    const outer = scope(module)
    const inner = scope(module, outer)
    const sibling = scope(module)
    const bindings = [
      declare(module, "x", { scope: inner }),
      declare(module, "x", { scope: outer }),
      declare(module, "x"),
      declare(module, "x", { scope: sibling }),
      declare(module, "user-id"),
      declare(module, "globalThis")
    ]
    assert.deepStrictEqual(finalize(module, bindings).roots, ["x", "x1", "x2", "x", "user_id", "globalThis1"])
    for (const name of ["Client", "x", "default", "invalid-name"]) {
      assert.throws(() => declare(module, name, { exact: true }), "Cannot declare exact name")
    }
    const name = declare(module, "invalid_name", { exact: true })
    assert.strictEqual(name.name, "invalid_name")
    assert.deepStrictEqual(finalize(module, [name]).roots, ["invalid_name"])
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
    const module = make()
    assert.deepStrictEqual(finalize(module, [code`values ${[1, null, undefined, false, ["ok"]]}`]).roots, [
      "values 1ok"
    ])
    const fields = join([code`${docComment(["A user.", "", "Has an id."])}id: string`, "age: number"], "\n")
    add(module, code`interface User {${indent(code`\n${fields}`)}\n}`)
    assert.strictEqual(
      print(module),
      "interface User {\n  /**\n   * A user.\n   *\n   * Has an id.\n   */\n  id: string\n  age: number\n}\n"
    )
    assert.throws(() => String(fields), "Code fragments must be rendered by their module")
  })
})
