import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Codegen from "@effect/utils/Codegen"
import * as Glob from "@effect/utils/Glob"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const MainLayer = Codegen.layer.pipe(Layer.provide(Glob.layer), Layer.provideMerge(NodeServices.layer))
const GlobLayer = Glob.layer.pipe(Layer.provideMerge(NodeServices.layer))
const bin = fileURLToPath(new URL("../src/bin.ts", import.meta.url))
const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex")
const header = "// retained fixture header\n// @barrel\n"
const staleBarrel = header + "\nexport const obsolete = true\n"
const moduleText = (name: string, since: string) =>
  `/**\n * Fixture ${name} module.\n *\n * @since ${since}\n */\nexport const value = "${name}"\n`
const generated = (name: string, since: string) =>
  `${header}\n/**\n * @since ${since}\n */\nexport * as ${name} from "./${name}.ts"\n`
const initial = {
  "hub/src/index.ts": staleBarrel,
  "hub/src/Foo.ts": moduleText("Foo", "1.0.0"),
  "hub/src/nested/index.ts": staleBarrel,
  "hub/src/nested/Bar.ts": moduleText("Bar", "2.0.0"),
  "hub/plain.ts": "export const notABarrel = true\n",
  "hub/unaffected.txt": "must remain byte-identical\n",
  "outside/src/index.ts": staleBarrel,
  "outside/src/Baz.ts": moduleText("Baz", "3.0.0"),
  "outside/unaffected.txt": "outside sentinel\n"
}

// Compare the complete tree: an unexpected write or extra file is a failure too.
const snapshot = (directory: string) => {
  const files: Record<string, { bytes: number; sha256: string }> = {}
  const visit = (relative: string) => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name)
      assert.isFalse(entry.isSymbolicLink(), `Unexpected symlink in owned fixture: ${name}`)
      if (entry.isDirectory()) {
        visit(name)
      } else {
        const data = fs.readFileSync(path.join(directory, name))
        files[name] = { bytes: data.length, sha256: sha256(data) }
      }
    }
  }
  visit("")
  return files
}

const prepare = (dir: string) => {
  for (const [file, content] of Object.entries(initial)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), content)
  }
  const hub = path.join(dir, "hub")
  return {
    dir,
    hub,
    index: path.join(hub, "src/index.ts"),
    nested: path.join(hub, "src/nested/index.ts"),
    outside: path.join(dir, "outside/src/index.ts"),
    plain: path.join(hub, "plain.ts"),
    before: snapshot(dir)
  }
}
type Fixture = ReturnType<typeof prepare>
const unchanged = (f: Fixture) => assert.deepStrictEqual(snapshot(f.dir), f.before)
const metadata = (file: string) => [{ path: file, pattern: "*.ts", offset: 2 }]
const relativeCwd = (f: Fixture) => path.relative(process.cwd(), f.hub)

const readOnlyFixture = (id: string) =>
  Effect.gen(function*() {
    const fileSystem = yield* FileSystem.FileSystem
    const dir = yield* fileSystem.makeTempDirectoryScoped({ prefix: `codegen-${id}-` })
    const fixture = prepare(dir)
    // Check preservation even on discovery failure, before scoped directory removal.
    yield* Effect.addFinalizer(() => Effect.sync(() => unchanged(fixture)))
    return fixture
  })

describe.sequential("Codegen", () => {
  describe("actual Glob service", () => {
    for (
      const [id, title, pattern, cwd, expected] of [
        [
          "glob-relative",
          "returns relative matches",
          () => "src/index.ts",
          (f: Fixture) => f.hub,
          () => ["src/index.ts"]
        ],
        [
          "glob-absolute",
          "preserves absolute matches",
          (f: Fixture) => f.index,
          (f: Fixture) => f.hub,
          (f: Fixture) => [f.index]
        ],
        [
          "glob-absolute-nested",
          "expands an absolute nested wildcard",
          (f: Fixture) => path.join(f.hub, "src/nested/*.ts"),
          (f: Fixture) => f.hub,
          (f: Fixture) => [path.join(f.hub, "src/nested/Bar.ts"), f.nested]
        ],
        [
          "glob-absolute-outside-cwd",
          "matches an absolute file outside cwd",
          (f: Fixture) => f.outside,
          (f: Fixture) => f.hub,
          (f: Fixture) => [f.outside]
        ],
        [
          "glob-relative-cwd",
          "keeps matches relative with a relative cwd",
          () => "src/index.ts",
          relativeCwd,
          () => ["src/index.ts"]
        ]
      ] as const
    ) {
      it.effect(`${title} (${id})`, () =>
        Effect.gen(function*() {
          const f = yield* readOnlyFixture(id)
          const glob = yield* Glob.Glob
          const actual = yield* glob.glob(pattern(f), { cwd: cwd(f), dot: false, follow: false, nodir: true })
          assert.deepStrictEqual(actual.slice().sort(), expected(f).slice().sort())
        }).pipe(Effect.provide(GlobLayer)))
    }
  })

  describe("BarrelGenerator.discoverFiles", () => {
    for (
      const [id, title, pattern, cwd, target] of [
        [
          "discover-relative",
          "discovers a relative barrel",
          () => "src/index.ts",
          (f: Fixture) => f.hub,
          (f: Fixture) => f.index
        ],
        [
          "discover-absolute-same-barrel",
          "gives both spellings of the same barrel identical metadata",
          (f: Fixture) => f.index,
          (f: Fixture) => f.hub,
          (f: Fixture) => f.index
        ],
        [
          "discover-relative-nested",
          "discovers a relative nested barrel",
          () => "src/nested/index.ts",
          (f: Fixture) => f.hub,
          (f: Fixture) => f.nested
        ],
        [
          "discover-absolute-nested",
          "discovers an absolute nested wildcard",
          (f: Fixture) => path.join(f.hub, "src/nested/index*.ts"),
          (f: Fixture) => f.hub,
          (f: Fixture) => f.nested
        ],
        [
          "discover-absolute-outside-cwd",
          "discovers an absolute barrel outside cwd",
          (f: Fixture) => f.outside,
          (f: Fixture) => f.hub,
          (f: Fixture) => f.outside
        ],
        [
          "discover-no-match-relative",
          "returns no barrels for an unmatched relative pattern",
          () => "src/missing*.ts",
          (f: Fixture) => f.hub,
          () => null
        ],
        [
          "discover-no-match-absolute",
          "returns no barrels for an unmatched absolute pattern",
          (f: Fixture) => path.join(f.hub, "src/missing*.ts"),
          (f: Fixture) => f.hub,
          () => null
        ],
        [
          "discover-non-barrel-relative",
          "filters a relative non-barrel",
          () => "plain.ts",
          (f: Fixture) => f.hub,
          () => null
        ],
        [
          "discover-non-barrel-absolute",
          "filters an absolute non-barrel",
          (f: Fixture) => f.plain,
          (f: Fixture) => f.hub,
          () => null
        ],
        [
          "discover-relative-cwd-relative-pattern",
          "preserves relative output paths with a relative cwd",
          () => "src/index.ts",
          relativeCwd,
          (f: Fixture) => path.relative(process.cwd(), f.index)
        ],
        [
          "discover-relative-cwd-absolute-pattern",
          "preserves absolute output paths with a relative cwd",
          (f: Fixture) => f.index,
          relativeCwd,
          (f: Fixture) => f.index
        ]
      ] as const
    ) {
      it.effect(`${title} (${id})`, () =>
        Effect.gen(function*() {
          const f = yield* readOnlyFixture(id)
          const generator = yield* Codegen.BarrelGenerator
          const c = cwd(f)
          const t = target(f)
          // This control must use exactly the same file and cwd as the absolute input.
          const relativeControl = id === "discover-absolute-same-barrel"
            ? yield* generator.discoverFiles("src/index.ts", c)
            : undefined
          if (relativeControl !== undefined) {
            assert.deepStrictEqual(relativeControl, metadata(f.index))
          }
          const actual = yield* generator.discoverFiles(pattern(f), c)
          assert.deepStrictEqual(actual, t === null ? [] : metadata(t))
          if (relativeControl !== undefined) {
            assert.deepStrictEqual(actual, relativeControl)
          }
          if (id === "discover-relative-cwd-relative-pattern") {
            assert.isFalse(path.isAbsolute(actual[0].path))
            assert.notStrictEqual(path.resolve(c, "src/index.ts"), actual[0].path)
          }
        }).pipe(Effect.provide(MainLayer)))
    }
  })

  describe("CLI", () => {
    for (
      const [id, title, pattern, cwd, output, content] of [
        [
          "cli-relative",
          "generates a relative barrel",
          () => "src/index.ts",
          (f: Fixture) => f.hub,
          "hub/src/index.ts",
          generated("Foo", "1.0.0")
        ],
        [
          "cli-absolute",
          "generates an absolute barrel",
          (f: Fixture) => f.index,
          (f: Fixture) => f.hub,
          "hub/src/index.ts",
          generated("Foo", "1.0.0")
        ],
        [
          "cli-relative-nested",
          "generates a relative nested barrel",
          () => "src/nested/index.ts",
          (f: Fixture) => f.hub,
          "hub/src/nested/index.ts",
          generated("Bar", "2.0.0")
        ],
        [
          "cli-absolute-nested",
          "generates an absolute nested wildcard",
          (f: Fixture) => path.join(f.hub, "src/nested/index*.ts"),
          (f: Fixture) => f.hub,
          "hub/src/nested/index.ts",
          generated("Bar", "2.0.0")
        ],
        [
          "cli-absolute-outside-cwd",
          "generates an absolute barrel outside cwd",
          (f: Fixture) => f.outside,
          (f: Fixture) => f.hub,
          "outside/src/index.ts",
          generated("Baz", "3.0.0")
        ],
        [
          "cli-no-match-relative",
          "leaves files unchanged for an unmatched relative pattern",
          () => "src/missing*.ts",
          (f: Fixture) => f.hub,
          null,
          null
        ],
        [
          "cli-no-match-absolute",
          "leaves files unchanged for an unmatched absolute pattern",
          (f: Fixture) => path.join(f.hub, "src/missing*.ts"),
          (f: Fixture) => f.hub,
          null,
          null
        ],
        [
          "cli-non-barrel-relative",
          "leaves a relative non-barrel unchanged",
          () => "plain.ts",
          (f: Fixture) => f.hub,
          null,
          null
        ],
        [
          "cli-non-barrel-absolute",
          "leaves an absolute non-barrel unchanged",
          (f: Fixture) => f.plain,
          (f: Fixture) => f.hub,
          null,
          null
        ],
        [
          "cli-relative-cwd-relative-pattern",
          "generates a relative barrel with a relative cwd",
          () => "src/index.ts",
          () => ".",
          "hub/src/index.ts",
          generated("Foo", "1.0.0")
        ],
        [
          "cli-relative-cwd-absolute-pattern",
          "generates an absolute barrel with a relative cwd",
          (f: Fixture) => f.index,
          () => ".",
          "hub/src/index.ts",
          generated("Foo", "1.0.0")
        ]
      ] as const
    ) {
      it(`${title} (${id})`, () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), `codegen-${id}-`))
        try {
          const f = prepare(dir)
          // The project is Node-only: process.execPath must run the actual Node CLI.
          const child = spawnSync(process.execPath, [bin, "codegen", "--cwd", cwd(f), "--pattern", pattern(f)], {
            cwd: f.hub,
            encoding: "utf8",
            timeout: 30_000
          })
          const expected = { ...f.before }
          if (output !== null) {
            expected[path.normalize(output)] = { bytes: Buffer.byteLength(content), sha256: sha256(content) }
          }
          // Even a failed CLI must not partially rewrite the target or another file.
          if (child.status !== 0) {
            unchanged(f)
          }
          assert.isUndefined(child.error)
          assert.isNull(child.signal)
          assert.strictEqual(child.status, 0, `CLI failed: ${child.stderr}`)
          assert.deepStrictEqual(snapshot(f.dir), expected)
          if (output !== null) {
            assert.strictEqual(fs.readFileSync(path.join(f.dir, output), "utf8"), content)
          }
        } finally {
          fs.rmSync(dir, { recursive: true, force: true })
        }
      }, 35_000)
    }
  })
})
