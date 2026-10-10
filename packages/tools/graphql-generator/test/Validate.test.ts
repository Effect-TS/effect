import type * as Model from "@effect/graphql-generator/internal/SchemaModel"
import * as Validate from "@effect/graphql-generator/internal/Validate"
import { assert, describe, it } from "@effect/vitest"
import { formatDiagnostic, parseOrThrow, source } from "./utils/ast.ts"
import { readSdl } from "./utils/model.ts"
import { type CaseFile, schemaSdl, validationGroups } from "./utils/validation.ts"

let cachedSchema: Model.Schema | undefined
const schema = () => (cachedSchema ??= readSdl(schemaSdl))

const validate = (files: ReadonlyArray<CaseFile>) =>
  Validate.validate(
    schema(),
    files.map((file) => ({ source: source(file.body, file.path), document: parseOrThrow(file.body, file.path) }))
  )

describe("Validate", () => {
  for (const group of validationGroups) {
    describe(group.rule, () => {
      group.valid.forEach((files, i) => {
        it(`passes valid documents (${i + 1})`, () => {
          const diagnostics = validate(files)
          assert.deepStrictEqual(diagnostics.map(formatDiagnostic), [])
        })
      })

      it("collects every diagnostic in the invalid documents", () => {
        const diagnostics = validate(group.invalid.files)
        assert.deepStrictEqual(
          diagnostics.map(({ column, line, message, path }) => ({ path, line, column, message })),
          group.invalid.diagnostics
        )
      })
    })
  }

  it("diagnostics carry a code frame for their location", () => {
    const [first] = validate(validationGroups[0].invalid.files)
    assert(first !== undefined, "expected a diagnostic")
    assert.strictEqual(first._tag, "Diagnostic")
    assert.strictEqual(
      first.codeFrame,
      [
        "3 |     id",
        "4 |     homepage",
        "  |     ^",
        "5 |     friends(first: 1) {"
      ].join("\n")
    )
  })
})
