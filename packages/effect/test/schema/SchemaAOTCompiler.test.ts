import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import * as CompilerRegistry from "effect/internal/schema/compilerRegistry"
import * as SchemaAOTCompiler from "effect/unstable/schema/SchemaAOTCompiler"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { roots, schemas, suspendEvaluations } from "./fixtures/aot.ts"

describe("SchemaAOTCompiler", { concurrent: false }, () => {
  it("emits deterministic modules without installing a decoder", () => {
    let checks = 0
    const schema = Schema.Struct({
      value: Schema.String.check(Schema.makeFilter(() => {
        checks++
        return true
      }))
    })
    const before = CompilerRegistry.resolve(schema.ast)
    const source = SchemaAOTCompiler.compile([schema.ast])
    assert.strictEqual(SchemaAOTCompiler.compile([schema.ast]), source)
    assert.strictEqual(CompilerRegistry.resolve(schema.ast), before)
    assert.strictEqual(checks, 0)
    assert.include(source, "effect/unstable/schema/SchemaCompiler/runtime")
    assert.notInclude(source, "new Function")
    assert.notInclude(source, "SchemaJITCompiler")
  })

  it("deduplicates repeated roots and dependencies shared across roots", () => {
    const child = Schema.Struct({ value: Schema.String })
    const first = Schema.Struct({ child })
    const second = Schema.Array(child)
    const source = SchemaAOTCompiler.compile([first.ast, second.ast])
    assert.strictEqual(
      SchemaAOTCompiler.compile([first.ast, second.ast, child.ast, first.ast, second.ast]),
      source
    )
  })

  it("runs generated decoders without dynamic code generation", () => {
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-test-", import.meta.url)))
    try {
      for (const [name, schema] of Object.entries(schemas)) {
        writeFileSync(join(directory, `${name}.mjs`), SchemaAOTCompiler.compile([schema.ast]))
      }
      writeFileSync(join(directory, "all.mjs"), SchemaAOTCompiler.compile(roots))
      writeFileSync(join(directory, "empty.mjs"), SchemaAOTCompiler.compile([]))
      assert.strictEqual(suspendEvaluations, 0)
      for (const mode of ["single", "multiple"]) {
        const output = execFileSync(process.execPath, [
          "--disallow-code-generation-from-strings",
          "--import",
          fileURLToPath(new URL("./fixtures/aot-import-guard.ts", import.meta.url)),
          fileURLToPath(new URL("./fixtures/aot-runner.ts", import.meta.url)),
          directory,
          mode
        ], { encoding: "utf8" })
        assert.include(output, "AOT integration passed")
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 20_000)
})
