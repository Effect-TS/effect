import * as babel from "@babel/core"
import * as ServiceShaking from "@effect/bundle/ServiceShaking"
import { assert, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { type InputOptions, type Plugin, rolldown } from "rolldown"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const packagesDir = fileURLToPath(new URL("../../../", import.meta.url))
const fixturesDir = path.join(packageDir, "fixtures", "service-shaking")
const nodeFileSystemSource = path.join(packagesDir, "platform", "node-shared", "src", "NodeFileSystem.ts")

// Fixtures whose only FileSystem demand is `readFile`, reached through a
// different access path in each.
const prunable = ["generator.ts", "combinators.ts", "context.ts", "overrides.ts"]

// Fixtures that can observe any FileSystem method, so nothing may be removed.
const bailouts = ["bailout-escape.ts", "bailout-inspect.ts", "bailout-unsafe-key.ts"]

const fixtureArgs: Record<string, ReadonlyArray<string>> = {
  "bailout-escape.ts": ["copy"]
}

// Code that only the unused NodeFileSystem methods reach: `copy`, `watch`,
// `makeTempDirectory*`, `truncate`, and the node:crypto / node:os imports used
// by the temp file helpers.
const unusedMethodCode = [
  /\bnodeCp\b/,
  /\bwatchNode\b/,
  /\bmakeTempDirectoryFactory\b/,
  /\bnodeTruncate\b/,
  /["']node:crypto["']/,
  /["']node:os["']/
]

// The published build annotates pure calls with babel. Rolldown relies on
// those annotations to drop unused module-scope calls such as the
// `const copy = (() => { ... })()` helpers in NodeFileSystem, so the same step
// is applied to every workspace source module.
const annotated = new Map<string, Promise<string>>()
const annotatePureCalls: Plugin = {
  name: "annotate-pure-calls",
  transform: {
    filter: { id: /\.ts$/ },
    async handler(code, id) {
      if (!id.startsWith(packagesDir) || id.startsWith(packageDir)) {
        return null
      }
      const key = `${id}\0${code}`
      let result = annotated.get(key)
      if (result === undefined) {
        result = esbuild.transform(code, {
          loader: "ts",
          format: "esm",
          target: "es2022",
          sourcefile: id,
          tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } }
        }).then((transpiled) =>
          babel.transformAsync(transpiled.code, {
            babelrc: false,
            configFile: false,
            compact: false,
            cwd: packageDir,
            filename: id,
            plugins: ["annotate-pure-calls"]
          })
        ).then((output) => output!.code!)
        annotated.set(key, result)
      }
      return { code: await result, moduleType: "js" }
    }
  }
}

// The hand-trimmed ceiling: NodeFileSystem built with `FileSystem.make({ readFile })`
// instead of the full implementation. This is the most a correct optimization
// can remove for a program that only reads files.
const keepOnlyReadFile: Plugin = {
  name: "keep-only-read-file",
  transform: {
    filter: { id: /NodeFileSystem\.ts$/ },
    handler(code, id) {
      if (id !== nodeFileSystemSource) {
        return null
      }
      const start = code.indexOf("FileSystem.make({")
      const end = code.indexOf("\n  }))", start)
      if (start === -1 || end === -1) {
        throw new Error("NodeFileSystem no longer builds its service with FileSystem.make({ ... })")
      }
      return code.slice(0, start) + "FileSystem.make({ readFile }" + code.slice(end + "\n  }".length)
    }
  }
}

const inputOptions = (fixture: string, plugins: ReadonlyArray<Plugin> = []): InputOptions => ({
  input: path.join(fixturesDir, fixture),
  cwd: packageDir,
  platform: "node",
  logLevel: "silent",
  plugins: [...plugins, annotatePureCalls]
})

const build = async (options: InputOptions): Promise<string> => {
  const bundle = await rolldown(options)
  try {
    const { output } = await bundle.generate({ format: "esm" })
    return output[0].code
  } finally {
    await bundle.close()
  }
}

const memo = <A>(f: (fixture: string) => Promise<A>) => {
  const cache = new Map<string, Promise<A>>()
  return (fixture: string): Promise<A> => {
    let result = cache.get(fixture)
    if (result === undefined) {
      result = f(fixture)
      cache.set(fixture, result)
    }
    return result
  }
}

const baseline = memo((fixture) => build(inputOptions(fixture)))
const ceiling = memo((fixture) => build(inputOptions(fixture, [keepOnlyReadFile])))
const shaken = memo((fixture) => ServiceShaking.bundle(inputOptions(fixture)))

let tempDir: Promise<string> | undefined
const getTempDir = () =>
  tempDir ??= fs.mkdtemp(path.join(os.tmpdir(), "effect-service-shaking-")).then(async (dir) => {
    await fs.writeFile(path.join(dir, "input.txt"), "hello")
    return dir
  })

let runs = 0
const run = async (code: string, fixture: string): Promise<string> => {
  const dir = await getTempDir()
  const file = path.join(dir, `bundle-${runs++}.mjs`)
  await fs.writeFile(file, code)
  const module = await import(/* @vite-ignore */ pathToFileURL(file).href)
  return module.main(path.join(dir, "input.txt"), ...(fixtureArgs[fixture] ?? []))
}

const size = (code: string) => Buffer.byteLength(code)

// Every build bundles the reachable Effect source through esbuild and babel.
const timeout = 60_000

describe("ServiceShaking", () => {
  for (const fixture of [...prunable, ...bailouts]) {
    it(`${fixture} behaves like the unoptimized bundle`, { timeout }, async () => {
      const [expected, actual] = await Promise.all([
        baseline(fixture).then((code) => run(code, fixture)),
        shaken(fixture).then((code) => run(code, fixture))
      ])
      assert.strictEqual(actual, expected)
    })
  }

  for (const fixture of prunable) {
    it(`${fixture} drops FileSystem methods the program never reads`, { timeout }, async () => {
      const [base, trimmed, actual] = await Promise.all([baseline(fixture), ceiling(fixture), shaken(fixture)])
      for (const code of unusedMethodCode) {
        assert.match(base, code, "baseline should contain the unused methods")
        assert.notMatch(trimmed, code, "hand-trimmed ceiling should not contain the unused methods")
      }
      for (const code of unusedMethodCode) {
        assert.notMatch(actual, code)
      }
      assert.isAtMost(
        size(actual),
        Math.ceil(size(trimmed) * 1.05),
        `baseline ${size(base)} bytes, hand-trimmed ceiling ${size(trimmed)} bytes`
      )
    })
  }

  for (const fixture of bailouts) {
    it(`${fixture} keeps every FileSystem method`, { timeout }, async () => {
      const [untrimmed, trimmed] = await Promise.all([
        baseline(fixture).then((code) => run(code, fixture)),
        ceiling(fixture).then((code) => run(code, fixture))
      ])
      assert.notStrictEqual(trimmed, untrimmed, "trimming FileSystem should be observable in this fixture")
      const actual = await shaken(fixture)
      for (const code of unusedMethodCode) {
        assert.match(actual, code)
      }
    })
  }
})
