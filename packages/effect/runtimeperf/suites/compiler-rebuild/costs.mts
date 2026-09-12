import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const [command, root, mode, operation, shape = "struct", countString = "500"] = process.argv.slice(2)
const count = Number(countString)
const load = (path: string) => import(pathToFileURL(join(root, "packages/effect/src", path + ".ts")).href)
const Schema = await load("Schema")
const Parser = await load("SchemaParser")
const AST = await load("SchemaAST")
const Effect = await load("Effect")
const create = () => {
  const struct = Schema.Struct({ name: Schema.String, age: Schema.Number, active: Schema.Boolean })
  return shape === "array" ? Schema.Array(struct)
    : shape === "transform" ? Schema.Struct({ value: Schema.NumberFromString })
    : shape === "default" ? Schema.Struct({ value: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1))) })
    : struct
}
const valid = shape === "array" ? Array.from({ length: 32 }, () => ({ name: "Ada", age: 37, active: true }))
  : shape === "transform" ? { value: "1" }
  : shape === "default" ? {}
  : { name: "Ada", age: 37, active: true }
const input = operation === "invalid" ? { name: "Ada", age: "bad", active: true } : valid

if (command === "generate") {
  const AOT = await load("unstable/schema/SchemaAOTCompiler")
  const schema = create()
  writeFileSync(process.argv[8], AOT.compile([schema.ast, AST.toType(schema.ast)]))
} else {
  for (let i = 0; i < 5; i++) globalThis.gc?.()
  const beforeImport = process.memoryUsage().heapUsed
  let enable: ((ast: unknown) => void) | undefined
  let install: ((asts: Array<unknown>) => void) | undefined
  let directory: string | undefined
  if (mode === "jit") {
    enable = (await load("unstable/schema/SchemaJITCompiler")).enable
  } else if (mode === "aot") {
    directory = mkdtempSync(join(root, "packages/effect/.compiler-memory-"))
    const generated = join(directory, "generated.mjs")
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), "generate", root, mode, operation, shape, countString, generated])
    install = (await import(pathToFileURL(generated).href)).install
  }
  for (let i = 0; i < 5; i++) globalThis.gc?.()
  const moduleBytes = process.memoryUsage().heapUsed - beforeImport
  const prepare = (schema: any) => {
    const ast = operation === "make" || operation === "is" ? AST.toType(schema.ast) : schema.ast
    if (enable) enable(ast)
    if (install) install([schema.ast, AST.toType(schema.ast)])
    return operation === "make" ? Parser.make(schema)
      : operation === "is" ? Parser.is(schema)
      : Parser.decodeUnknownSync(schema)
  }
  const run = (parse: (input: unknown) => unknown) => {
    try {
      const value = parse(input)
      assert.notEqual(operation, "invalid")
      return value
    } catch (error) {
      if (operation !== "invalid") throw error
      assert.equal((error as Error).message, "Schema validation failed")
    }
  }
  try {
    for (let i = 0; i < 20; i++) run(prepare(create()))
    if (command === "heap") {
      assert.equal(typeof globalThis.gc, "function")
      const schemas = Array.from({ length: count }, create)
      for (let i = 0; i < 5; i++) globalThis.gc!()
      const before = process.memoryUsage().heapUsed
      const parsers = schemas.map((schema) => { const parse = prepare(schema); run(parse); return parse })
      for (let i = 0; i < 5; i++) globalThis.gc!()
      const after = process.memoryUsage().heapUsed
      // Keep schemas and adapters alive across the measurement.
      assert.equal(parsers.length, count)
      assert.equal(schemas.length, count)
      process.stdout.write(JSON.stringify({ mode, operation, shape, count, moduleBytes, bytesPerSchema: (after - before) / count }))
    } else if (command === "cold") {
      const samples = []
      for (let round = 0; round < 7; round++) {
        const start = process.hrtime.bigint()
        for (let i = 0; i < count; i++) run(prepare(create()))
        samples.push(Number(process.hrtime.bigint() - start) / count)
      }
      process.stdout.write(JSON.stringify({ mode, operation, shape, count, nsPerSchema: samples }))
    }
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true })
  }
}
