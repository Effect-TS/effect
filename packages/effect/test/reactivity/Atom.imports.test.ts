import { assert, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import * as path from "node:path"

const repoRoot = path.resolve(import.meta.dirname, "../../../..")

const bundledInputs = async (source: string): Promise<Array<string>> => {
  const result = await esbuild.build({
    absWorkingDir: repoRoot,
    stdin: {
      contents: source,
      resolveDir: repoRoot,
      sourcefile: "entry.ts",
      loader: "ts"
    },
    bundle: true,
    write: false,
    metafile: true,
    treeShaking: false,
    format: "esm",
    platform: "neutral",
    packages: "external",
    logLevel: "silent"
  })
  return Object.keys(result.metafile.inputs)
}

const reaches = (inputs: ReadonlyArray<string>, fileName: string): boolean =>
  inputs.some((input) => input.endsWith(`/${fileName}`) || input.endsWith(`\\${fileName}`))

describe("reactivity import graph", () => {
  it("keeps Schema and KeyValueStore off Atom.make", async () => {
    const inputs = await bundledInputs(
      `import { make } from "./packages/effect/src/reactivity/Atom.ts"\nexport const atom = make(0)\n`
    )
    assert.strictEqual(reaches(inputs, "Schema.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaIssue.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaParser.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaTransformation.ts"), false)
    assert.strictEqual(reaches(inputs, "KeyValueStore.ts"), false)
  })

  it("keeps Schema off AsyncResult values", async () => {
    const inputs = await bundledInputs(
      `import { initial } from "./packages/effect/src/reactivity/AsyncResult.ts"\nexport const result = initial()\n`
    )
    assert.strictEqual(reaches(inputs, "Schema.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaIssue.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaParser.ts"), false)
    assert.strictEqual(reaches(inputs, "SchemaTransformation.ts"), false)
  })

  it("still reaches Schema from the serialization helpers", async () => {
    const inputs = await bundledInputs(
      `import { serializable } from "./packages/effect/src/reactivity/AtomSerializable.ts"\nexport { serializable }\n`
    )
    assert.strictEqual(reaches(inputs, "Schema.ts"), true)
  })
})
