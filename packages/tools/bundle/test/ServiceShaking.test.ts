import * as babel from "@babel/core"
import * as ServiceShaking from "@effect/bundle/ServiceShaking"
import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
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

// Small programs from the adversarial review where pruning changed behaviour.
// Bailing out is an acceptable fix for each of them.
const regressions = [
  "release-and-tap.ts",
  "logger-fiber.ts",
  "on-fiber-start.ts",
  "run-fork-hook.ts",
  "receiver-method.ts",
  "inherited-members.ts",
  "async-factory.ts",
  "key-mutation.ts",
  "separator-comment.ts",
  "redactable-option.ts",
  "global-fiber.ts",
  "arguments-callbacks.ts",
  "mutable-receiver.ts",
  "nested-providers.ts"
]

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
const load = async (code: string) => {
  const dir = await getTempDir()
  const file = path.join(dir, `bundle-${runs++}.mjs`)
  await fs.writeFile(file, code)
  return import(/* @vite-ignore */ pathToFileURL(file).href)
}

const run = async (code: string, fixture: string): Promise<string> => {
  const module = await load(code)
  return module.main(path.join(await getTempDir(), "input.txt"), ...(fixtureArgs[fixture] ?? []))
}

const size = (code: string) => Buffer.byteLength(code)

// Every build bundles the reachable Effect source through esbuild and babel.
const timeout = 60_000

describe("ServiceShaking", () => {
  for (const fixture of [...prunable, ...bailouts, ...regressions]) {
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

  it("exported-layer.ts keeps provider methods reachable from outside the bundle", { timeout }, async () => {
    const fixture = "exported-layer.ts"
    // Builds the exported Layer the way an importer of the bundle would.
    const methods = async (code: string) => {
      const { layer } = await load(code)
      const context = await Effect.runPromise(Effect.scoped(Layer.build(layer)))
      return Object.keys(Context.getOrUndefinedUnsafe<object>(context, "test/Exported") ?? {}).sort()
    }
    const [expected, actual] = await Promise.all([baseline(fixture).then(methods), shaken(fixture).then(methods)])
    assert.deepStrictEqual(expected, ["read", "unused"])
    assert.deepStrictEqual(actual, expected)
  })

  it("second-pass-drift.ts ignores edits when a consumer transforms differently in the second build", {
    timeout
  }, async () => {
    const fixture = "second-pass-drift.ts"
    let transforms = 0
    const drift: Plugin = {
      name: "second-pass-drift",
      transform: {
        filter: { id: /second-pass-drift\.ts$/ },
        handler: (code) => ++transforms === 1 ? null : code.replace("s.read()", "s.unused()")
      }
    }
    const code = await ServiceShaking.bundle(inputOptions(fixture, [drift]))
    // Demand was computed from the first build, so only its output is safe.
    assert.strictEqual(await run(code, fixture), "1")
  })

  it("resolution-drift.ts ignores edits when an import resolves differently in the second build", {
    timeout
  }, async () => {
    const fixture = "resolution-drift.ts"
    let builds = 0
    const drift: Plugin = {
      name: "resolution-drift",
      buildStart: () => {
        builds++
      },
      resolveId: (source, importer) =>
        builds === 2 && source === "./resolution-drift-a.ts" && importer?.endsWith(`${path.sep}resolution-drift.ts`)
          ? path.join(fixturesDir, "resolution-drift-b.ts")
          : null
    }
    const code = await ServiceShaking.bundle(inputOptions(fixture, [drift]))
    assert.strictEqual(await run(code, fixture), "1")
  })

  it("external-module.ts keeps methods an external module can observe", { timeout }, async () => {
    const fixture = "external-module.ts"
    const external: Plugin = {
      name: "external-helper",
      resolveId: (source) =>
        source === "./external-helper.ts" ? { id: path.join(fixturesDir, "external-helper.ts"), external: true } : null
    }
    // The bundle runs from a temporary directory, so the import must stay absolute.
    const options: InputOptions = { ...inputOptions(fixture, [external]), makeAbsoluteExternalsRelative: false }
    const expected = await run(await build(options), fixture)
    const actual = await run(await ServiceShaking.bundle(options), fixture)
    assert.strictEqual(expected, "function")
    assert.strictEqual(actual, expected)
  })

  describe("code importing the bundle can run inside a provider's scope", () => {
    // Lists the methods of a service, read from the current Context by key.
    const methodsOf = (key: string) =>
      Effect.map(
        Effect.context(),
        (context) => Object.keys(Context.getOrUndefinedUnsafe<object>(context, key) ?? {}).sort()
      )

    // Runs `use` against the unoptimized bundle, then the shaken one.
    const importer = async <A>(fixture: string, use: (module: any) => Promise<A>) => {
      const expected = await use(await load(await baseline(fixture)))
      const actual = await use(await load(await shaken(fixture)))
      return { expected, actual }
    }

    it("scope-effect-input.ts: an Effect passed to an exported function", { timeout }, async () => {
      const { expected, actual } = await importer(
        "scope-effect-input.ts",
        (module) => module.main(methodsOf("test/ScopeEffectInput"))
      )
      assert.deepStrictEqual(expected, ["read", "unused"])
      assert.deepStrictEqual(actual, expected)
    })

    it("scope-layer-input.ts: a Layer passed to an exported function", { timeout }, async () => {
      const { expected, actual } = await importer("scope-layer-input.ts", async (module) => {
        let seen: ReadonlyArray<string> = []
        const input = Layer.effectDiscard(
          Effect.map(methodsOf("test/ScopeLayerInput"), (methods) => {
            seen = methods
          })
        )
        await module.main(input)
        return seen
      })
      assert.deepStrictEqual(expected, ["read", "unused"])
      assert.deepStrictEqual(actual, expected)
    })

    it("scope-transformer.ts: an exported Effect.provide transformer", { timeout }, async () => {
      const { expected, actual } = await importer(
        "scope-transformer.ts",
        (module) => Effect.runPromise(module.supply(methodsOf("test/ScopeTransformer")))
      )
      assert.deepStrictEqual(expected, ["read", "unused"])
      assert.deepStrictEqual(actual, expected)
    })

    it("scope-exported-effect.ts: an exported Effect run with the importer's logger", { timeout }, async () => {
      const { expected, actual } = await importer("scope-exported-effect.ts", async (module) => {
        const seen: Array<string> = []
        const logger = Logger.make((options) => {
          const services: ReadonlyMap<string, object> = Reflect.get(Reflect.get(options.fiber, "context"), "mapUnsafe")
          seen.push(typeof Reflect.get(services.get("test/ScopeExportedEffect")!, "unused"))
        })
        await Effect.runPromise(Effect.provide(module.program, Logger.layer([logger])))
        return seen
      })
      assert.deepStrictEqual(expected, ["function"])
      assert.deepStrictEqual(actual, expected)
    })
  })
})
