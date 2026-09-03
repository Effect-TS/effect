import { computeJSDocInputHash, extractJSDocsSync, getProgram, sourceHash } from "@effect/jsdocs"
import { afterEach, assert, describe, it } from "@effect/vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

const config = {
  compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022" },
  include: ["src/**/*.ts"]
}
const packageMetadata = {
  name: "@effect/sample",
  type: "module",
  exports: { ".": "./src/index.ts", "./*": "./src/*.ts" }
}
const beforeSource = `/**
 * Measures the input.
 *
 * @category constructors
 * @since 1.0.0
 */
export const before = (value: string) => value.length
`
const afterSource = `/**
 * Renders the input.
 *
 * @category constructors
 * @since 1.0.0
 */
export const after = (value: number) => String(value)
`

const fixtureRoots = new Set<string>()

afterEach(() => {
  for (const root of fixtureRoots) {
    fs.rmSync(root, { recursive: true, force: true })
  }
  fixtureRoots.clear()
})

// Same tiny package layout as jsdocs.test.ts; every call owns a fresh root.
const fixture = (source = beforeSource) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "jsdocs-cache-"))
  fixtureRoots.add(cwd)
  fs.mkdirSync(path.join(cwd, "src"))
  fs.writeFileSync(path.join(cwd, "tsconfig.json"), JSON.stringify(config))
  fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify(packageMetadata))
  fs.writeFileSync(path.join(cwd, "src/index.ts"), `export * as Foo from "./Foo.ts"\n`)
  fs.writeFileSync(path.join(cwd, "src/Foo.ts"), source)
  return { cwd, tsconfig: "tsconfig.json", include: ["src/**/*.ts"], output: ".data/jsdocs.json" }
}

type Model = ReturnType<typeof extractJSDocsSync>

const assertValid = (model: Model) => {
  assert.strictEqual(model.version, 2)
  assert.strictEqual(model.generatedBy, "@effect/jsdocs")
  assert.deepStrictEqual(model.files.flatMap((file) => file.diagnostics), [])
  assert.deepStrictEqual(JSON.parse(JSON.stringify(model)), model)
}

const assertFreshHashes = (model: Model, options: ReturnType<typeof fixture>) => {
  assert.strictEqual(model.inputHash, computeJSDocInputHash(options))
  for (const file of model.files) {
    assert.strictEqual(file.hash, sourceHash(fs.readFileSync(path.join(options.cwd, file.file), "utf8")))
  }
}

const editSource = () => {
  const options = fixture()
  const first = extractJSDocsSync(options)
  assertValid(first)
  assert.strictEqual(first.files[0]?.declarations[0]?.name, "before")
  assert.strictEqual(first.apis[0]?.signature, "declare function before(value: string): number")
  const unchanged = extractJSDocsSync(options)
  assert.deepStrictEqual(unchanged.files, first.files)
  assert.deepStrictEqual(unchanged.apis, first.apis)
  fs.writeFileSync(path.join(options.cwd, "src/Foo.ts"), afterSource)
  const second = extractJSDocsSync(options)
  assertValid(second)
  assertFreshHashes(second, options)
  assert.notStrictEqual(second.inputHash, first.inputHash)
  assert.notStrictEqual(second.files[0]?.hash, first.files[0]?.hash)
  return { first, second }
}

describe("jsdocs extraction cache coherence", () => {
  it("keeps an unchanged model stable across extractions", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    const second = extractJSDocsSync(options)
    assertValid(first)
    assertValid(second)
    assertFreshHashes(second, options)
    assert.strictEqual(second.inputHash, first.inputHash)
    assert.deepStrictEqual(second.files, first.files)
    assert.deepStrictEqual(second.apis, first.apis)
    assert.strictEqual(fs.existsSync(path.join(options.cwd, options.output)), false)
  })

  it("supports the updated source in an independent fresh root", () => {
    const original = extractJSDocsSync(fixture())
    const options = fixture(afterSource)
    const fresh = extractJSDocsSync(options)
    assertValid(original)
    assertValid(fresh)
    assertFreshHashes(fresh, options)
    assert.strictEqual(original.apis[0]?.apiName, "before")
    assert.strictEqual(fresh.files[0]?.declarations[0]?.name, "after")
    assert.strictEqual(fresh.apis[0]?.apiName, "after")
    assert.strictEqual(fresh.apis[0]?.description.short, "Renders the input.")
    assert.strictEqual(fresh.apis[0]?.signature, "declare function after(value: number): string")
  })

  it("hashes the freshly saved source and extraction inputs", () => {
    editSource()
  })

  it("refreshes declaration names after a sequential source save", () => {
    const { second } = editSource()
    assert.deepStrictEqual(second.files[0]?.declarations.map((declaration) => declaration.name), ["after"])
    assert.deepStrictEqual(second.apis.map((api) => api.apiFqn), ["@effect/sample/Foo.after"])
  })

  it("refreshes descriptions after a sequential source save", () => {
    const { second } = editSource()
    assert.strictEqual(second.files[0]?.declarations[0]?.description.short, "Renders the input.")
    assert.strictEqual(second.apis[0]?.description.short, "Renders the input.")
  })

  it("refreshes inferred signatures after a sequential source save", () => {
    const { second } = editSource()
    assert.strictEqual(second.files[0]?.declarations[0]?.signature, "declare function after(value: number): string")
    assert.strictEqual(second.apis[0]?.signature, "declare function after(value: number): string")
  })

  it("refreshes a renamed barrel namespace", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    assert.strictEqual(first.apis[0]?.importGuidance?.usage, "Foo.before")
    fs.writeFileSync(path.join(options.cwd, "src/index.ts"), `export * as Renamed from "./Foo.ts"\n`)
    const second = extractJSDocsSync(options)
    assertValid(second)
    assertFreshHashes(second, options)
    assert.notStrictEqual(second.inputHash, first.inputHash)
    assert.strictEqual(second.files[0]?.hash, first.files[0]?.hash)
    assert.deepStrictEqual(second.files[0]?.imports?.barrel, {
      type: "namespace",
      module: "@effect/sample",
      name: "Renamed"
    })
    assert.deepStrictEqual(second.apis[0]?.importGuidance, {
      style: "namespace-barrel",
      importDeclaration: "import { Renamed } from \"@effect/sample\"",
      usage: "Renamed.before"
    })
  })

  it("refreshes namespace exports changed to flat barrel exports", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    assert.strictEqual(first.apis[0]?.importGuidance?.style, "namespace-barrel")
    fs.writeFileSync(path.join(options.cwd, "src/index.ts"), `export * from "./Foo.ts"\n`)
    const second = extractJSDocsSync(options)
    assertValid(second)
    assertFreshHashes(second, options)
    assert.notStrictEqual(second.inputHash, first.inputHash)
    assert.deepStrictEqual(second.files[0]?.imports?.barrel, { type: "flat", module: "@effect/sample" })
    assert.deepStrictEqual(second.apis[0]?.importGuidance, {
      style: "named-barrel",
      importDeclaration: "import { before } from \"@effect/sample\"",
      usage: "before"
    })
  })

  it("refreshes package names in model identities and imports", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    assert.strictEqual(first.apis[0]?.apiFqn, "@effect/sample/Foo.before")
    fs.writeFileSync(
      path.join(options.cwd, "package.json"),
      JSON.stringify({ ...packageMetadata, name: "@effect/renamed" })
    )
    const second = extractJSDocsSync(options)
    assertValid(second)
    assertFreshHashes(second, options)
    assert.notStrictEqual(second.inputHash, first.inputHash)
    assert.strictEqual(second.files[0]?.hash, first.files[0]?.hash)
    assert.strictEqual(second.files[0]?.imports?.module, "@effect/renamed/Foo")
    assert.strictEqual(second.apis[0]?.moduleName, "@effect/renamed/Foo")
    assert.strictEqual(second.apis[0]?.apiFqn, "@effect/renamed/Foo.before")
    assert.strictEqual(second.apis[0]?.id, "root-declaration:value:@effect/renamed/Foo.before")
    assert.deepStrictEqual(second.apis[0]?.importGuidance, {
      style: "namespace-barrel",
      importDeclaration: "import { Foo } from \"@effect/renamed\"",
      usage: "Foo.before"
    })
  })

  it("refreshes package exports when the root barrel is no longer exported", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    assert.strictEqual(first.apis[0]?.importGuidance?.style, "namespace-barrel")
    fs.writeFileSync(
      path.join(options.cwd, "package.json"),
      JSON.stringify({ ...packageMetadata, exports: { "./*": "./src/*.ts" } })
    )
    const second = extractJSDocsSync(options)
    assertValid(second)
    assertFreshHashes(second, options)
    assert.notStrictEqual(second.inputHash, first.inputHash)
    assert.strictEqual(second.files[0]?.imports?.barrel, null)
    assert.deepStrictEqual(second.apis[0]?.importGuidance, {
      style: "named-module",
      importDeclaration: "import { before } from \"@effect/sample/Foo\"",
      usage: "before"
    })
  })

  it("includes a newly added file matched by the existing tsconfig", () => {
    const options = fixture()
    const first = extractJSDocsSync(options)
    assert.deepStrictEqual(first.files.map((file) => file.file), ["src/Foo.ts"])
    fs.writeFileSync(path.join(options.cwd, "src/Added.ts"), afterSource)
    const second = extractJSDocsSync(options)
    assertFreshHashes(second, options)
    assert.notStrictEqual(second.inputHash, first.inputHash)
    assertValid(second)
    assert.deepStrictEqual(second.files.map((file) => file.file), ["src/Added.ts", "src/Foo.ts"])
    assert.deepStrictEqual(second.apis.map((api) => api.apiFqn), [
      "@effect/sample/Added.after",
      "@effect/sample/Foo.before"
    ])
  })

  it("recovers after an invalid tsconfig is fixed between extractions", () => {
    const options = fixture()
    const filename = path.join(options.cwd, "tsconfig.json")
    fs.writeFileSync(filename, JSON.stringify({ ...config, compilerOptions: { target: "invalid-target" } }))
    assert.throws(() => extractJSDocsSync(options), /Unable to parse TypeScript config.*Argument for '--target'/)
    assert.throws(() => extractJSDocsSync(options), /Unable to parse TypeScript config.*Argument for '--target'/)
    fs.writeFileSync(filename, JSON.stringify(config))
    const model = extractJSDocsSync(options)
    assertValid(model)
    assertFreshHashes(model, options)
    assert.strictEqual(model.apis[0]?.apiName, "before")
  })

  it("preserves diagnostics for a file still excluded by tsconfig", () => {
    const options = fixture()
    fs.writeFileSync(path.join(options.cwd, "tsconfig.json"), JSON.stringify({ ...config, exclude: ["src/Added.ts"] }))
    fs.writeFileSync(path.join(options.cwd, "src/Added.ts"), afterSource)
    const first = extractJSDocsSync(options)
    const second = extractJSDocsSync(options)
    assert.strictEqual(second.version, 2)
    assertFreshHashes(second, options)
    assert.deepStrictEqual(second.files, first.files)
    assert.deepStrictEqual(second.apis, first.apis)
    assert.deepStrictEqual(second.files[0]?.diagnostics, [{
      code: "tsconfig",
      message: "src/Added.ts is not included in tsconfig.json",
      range: [0, 0]
    }])
    assert.deepStrictEqual(second.apis.map((api) => api.apiName), ["before"])
  })

  it("keeps direct getProgram calls cached and retained program objects usable", () => {
    const options = fixture()
    const filename = path.join(options.cwd, "tsconfig.json")
    const sourceFile = path.join(options.cwd, "src/Foo.ts")
    const retained = getProgram(filename)
    assert.isDefined(retained.program)
    assert.strictEqual(getProgram(filename), retained)
    fs.writeFileSync(sourceFile, afterSource)
    assert.strictEqual(getProgram(filename), retained)
    assert.strictEqual(retained.program?.getSourceFile(sourceFile)?.text, beforeSource)
    extractJSDocsSync(options)
    assert.strictEqual(retained.program?.getSourceFile(sourceFile)?.text, beforeSource)
    const current = getProgram(filename)
    assert.strictEqual(getProgram(filename), current)
    assert.isDefined(current.program?.getTypeChecker())
  })
})
