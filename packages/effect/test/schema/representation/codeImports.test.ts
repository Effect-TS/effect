import { assert, describe, it } from "@effect/vitest"
import { addImport, addSideEffect, finalize, make } from "effect/internal/codegen"
import * as Imports from "effect/internal/schema/codeImports"

describe("code generation imports", () => {
  it("reads local bindings from import syntax", () => {
    const cases = [
      [`import * as Namespace from "module"`, [["Namespace", "*", "Namespace", false]]],
      [`import Default, { value as Alias, type Type } from 'module';`, [
        ["Default", "default", "Default", false],
        ["Named", "value", "Alias", false],
        ["Named", "Type", "Type", true]
      ]],
      [`import type Default from "module"`, [["Default", "default", "Default", true]]],
      [`import type * as Namespace from "module"`, [["Namespace", "*", "Namespace", true]]],
      [`import type { Type as Alias } from "module"`, [["Named", "Type", "Alias", true]]],
      [`import { type as value, type as, type as as Alias } from "module"`, [
        ["Named", "type", "value", false],
        ["Named", "as", "as", true],
        ["Named", "as", "Alias", true]
      ]],
      [`import { type as as } from "module"`, [["Named", "type", "as", false]]],
      [`import type from "module"`, [["Default", "default", "type", false]]],
      [`import { value as 𝒜 } from "module"`, [["Named", "value", "𝒜", false]]],
      [`import /* comment */ { "export-name" as Alias, value as \\u0058 } from "module"`, [
        ["Named", "export-name", "Alias", false],
        ["Named", "value", "X", false]
      ]]
    ] as const
    for (const [source, expected] of cases) {
      const parsed = Imports.parse(source)
      assert.deepStrictEqual(
        parsed.map((binding) =>
          binding.kind === "SideEffect" ? binding : [
            binding.kind,
            binding.imported,
            binding.local,
            binding.typeOnly
          ]
        ),
        expected.map((binding) => [...binding]),
        source
      )
      assert.isTrue(parsed.every((binding) => binding.module === "module"))
    }
  })

  it("preserves evaluation order, attributes and runtime imports when deduplicating", () => {
    const parsed = Imports.parse(`
      import type { Value } from "first";
      import "side-effect";
      import { Value } from "first";
      import Data from "data\\x2ejson" with { type: "json" };
      import { type Only } from "inline-type";
      import type {} from "unused";
    `)
    const module = make()
    const bindings = [parsed, parsed].flatMap((imports) =>
      imports.flatMap((imported) => {
        if (imported.kind === "SideEffect") {
          addSideEffect(module, imported.module, imported.attributes)
          return []
        }
        return [addImport(module, imported)]
      })
    )
    assert.deepStrictEqual(finalize(module, bindings).imports, [
      "import \"side-effect\"",
      "import { Value } from \"first\"",
      "import Data from \"data.json\" with { \"type\": \"json\" }",
      "import type { Only } from \"inline-type\"",
      "import \"inline-type\""
    ])
  })

  it("rejects malformed imports", () => {
    for (const source of ["import * Value from 'x'", "import { A from 'x'", "import A from 'unterminated"]) {
      assert.throws(() => Imports.parse(source), "Invalid import declaration")
    }
  })
})
