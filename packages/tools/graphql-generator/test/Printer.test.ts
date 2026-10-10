import type * as Ast from "@effect/graphql-generator/internal/Ast"
import { print } from "@effect/graphql-generator/internal/Printer"
import { assert, describe, it } from "@effect/vitest"
import { readdirSync, readFileSync } from "node:fs"
import { parseOrThrow, stripLoc } from "./utils/ast.ts"
import { executableCases } from "./utils/cases.ts"

const operationsDirectory = new URL("./fixtures/github/operations/", import.meta.url)

const fixtureOperations = readdirSync(operationsDirectory)
  .filter((file) => file.endsWith(".graphql"))
  .sort()
  .map((file) => ({ file, body: readFileSync(new URL(file, operationsDirectory), "utf8") }))

describe("Printer", () => {
  describe("compact form", () => {
    for (const testCase of executableCases) {
      it(testCase.name, () => {
        assert.strictEqual(print(parseOrThrow(testCase.source)), testCase.printed)
      })
    }
  })

  describe("round trip", () => {
    for (const testCase of executableCases) {
      it(`${testCase.name}: parse, print, parse gives the same AST and the same text`, () => {
        const document = parseOrThrow(testCase.source)
        const printed = print(document)
        const reparsed = parseOrThrow(printed)
        assert.deepStrictEqual(stripLoc(reparsed), stripLoc(document))
        assert.strictEqual(print(reparsed), printed)
      })
    }

    for (const { body, file } of fixtureOperations) {
      it(`GitHub operations ${file}`, () => {
        const document = parseOrThrow(body, file)
        const printed = print(document)
        const reparsed = parseOrThrow(printed, `${file} (printed)`)
        assert.deepStrictEqual(stripLoc(reparsed), stripLoc(document))
        assert.strictEqual(print(reparsed), printed)
      })
    }

    it("the fixture directory has the four operation documents", () => {
      assert.deepStrictEqual(
        fixtureOperations.map(({ file }) => file),
        ["issue-timeline.graphql", "mutations.graphql", "search.graphql", "viewer.graphql"]
      )
    })
  })

  describe("details", () => {
    it("block string arguments are dedented and printed as regular strings", () => {
      const search = fixtureOperations.find(({ file }) => file === "search.graphql")!
      assert.include(
        print(parseOrThrow(search.body)),
        "pinned:search(query:\"is:public\\nstars:>1000\" type:REPOSITORY first:1)@skip(if:$withOwner){repositoryCount}"
      )
    })

    it("prints a synthesised document of selected definitions in the order given", () => {
      const parsed = parseOrThrow("query Q { ...B ...A } fragment A on T { a } fragment B on T { b }")
      const [query, a, b] = parsed.definitions as ReadonlyArray<Ast.ExecutableDefinition>
      const document: Ast.Document = { _tag: "Document", definitions: [query!, b!, a!], loc: { start: 0, end: 0 } }
      assert.strictEqual(print(document), "query Q{...B...A}fragment B on T{b}fragment A on T{a}")
    })

    it("prints no trailing newline", () => {
      assert.strictEqual(print(parseOrThrow("{ a }\n")), "{a}")
    })
  })
})
