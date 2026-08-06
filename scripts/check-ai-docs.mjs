import * as ChildProcess from "node:child_process"
import * as Fs from "node:fs"
import * as Glob from "glob"
import * as Os from "node:os"
import * as Path from "node:path"

const sourceFiles = Glob.globSync("ai-docs/**/*", {
  nodir: true,
  ignore: ["ai-docs/{dist,node_modules}/**"]
}).sort()
const llms = Fs.readFileSync("LLMS.md")
const linkedFiles = [...new Set(
  [...llms.toString().matchAll(/\]\(\.\/(ai-docs\/[^)#?]+)/g)].map((match) => match[1])
)]

let packageCount = 0
for (const packageJsonPath of Glob.globSync("packages/{*,*/*}/package.json")) {
  const packageJson = JSON.parse(Fs.readFileSync(packageJsonPath, "utf8"))
  if (packageJson.private) continue
  packageCount++

  const packageDirectory = Path.dirname(packageJsonPath)
  if (!packageJson.files.includes("ai-docs/**/*")) {
    throw new Error(`${packageJsonPath} does not publish ai-docs/**/*`)
  }

  for (const entrypoint of ["AGENTS.md", "CLAUDE.md"]) {
    const actual = Fs.readFileSync(Path.join(packageDirectory, entrypoint))
    if (!actual.equals(llms)) throw new Error(`${packageDirectory}/${entrypoint} differs from LLMS.md`)
  }

  const copiedFiles = Glob.globSync(Path.join(packageDirectory, "ai-docs/**/*"), { nodir: true })
    .map((file) => Path.relative(packageDirectory, file))
    .sort()
  if (copiedFiles.join("\n") !== sourceFiles.join("\n")) {
    throw new Error(`${packageDirectory}/ai-docs does not match the source file list`)
  }

  for (const sourceFile of sourceFiles) {
    const targetFile = Path.join(packageDirectory, sourceFile)
    if (!Fs.readFileSync(targetFile).equals(Fs.readFileSync(sourceFile))) {
      throw new Error(`${targetFile} differs from ${sourceFile}`)
    }
  }

  for (const linkedFile of linkedFiles) {
    if (!Fs.existsSync(Path.join(packageDirectory, linkedFile))) {
      throw new Error(`${packageDirectory}/${linkedFile} is missing`)
    }
  }
}

const packDirectory = Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-ai-docs-"))
try {
  const packed = JSON.parse(ChildProcess.execFileSync("pnpm", [
    "--dir",
    "packages/effect",
    "pack",
    "--pack-destination",
    packDirectory,
    "--json"
  ], { encoding: "utf8" }))
  const packedFiles = new Set(packed.files.map((file) => file.path))
  for (const expectedFile of ["AGENTS.md", "CLAUDE.md"]) {
    if (!packedFiles.has(expectedFile)) {
      throw new Error(`${packed.name} tarball is missing ${expectedFile}`)
    }
  }
  const packedAiDocs = [...packedFiles].filter((file) => file.startsWith("ai-docs/")).sort()
  if (packedAiDocs.join("\n") !== sourceFiles.join("\n")) {
    throw new Error(`${packed.name} tarball ai-docs file list does not match the source`)
  }
} finally {
  Fs.rmSync(packDirectory, { recursive: true, force: true })
}

console.log(`${packageCount} publishable packages contain ${sourceFiles.length} matching ai-docs files`)
console.log(`${linkedFiles.length} relative ai-docs links resolve in every package`)
console.log("effect tarball contains both entrypoints and the complete ai-docs folder")
