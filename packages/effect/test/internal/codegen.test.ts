import { assert, describe, it } from "@effect/vitest"
import { code, deferred, Module } from "effect/internal/codegen"

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
      ["const Option1 = { Option: \"Option\" }"],
      ["const await1 = Option.some(Option1)"]
    ])
    assert.deepStrictEqual(output.roots, ["await1"])
  })

  it("renders shared fragments once per phase", () => {
    const module = new Module()
    let calls = 0
    const shared = deferred(() => {
      calls++
      return "value"
    })
    let fragment = shared
    for (let i = 0; i < 12; i++) fragment = code`${fragment}${fragment}`
    assert.strictEqual(module.finalize([fragment]).roots[0], "value".repeat(4096))
    assert.strictEqual(calls, 2)
  })

  it("rejects eager cycles and imports competing for the same fixed name", () => {
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
    assert.strictEqual(imports.addImport(input), imports.addImport(input))
    assert.throws(() => imports.addImport({ ...input, module: "two" }), "Conflicting imports for Value")
  })
})
