/**
 * The bundle check: bundles the composition roots with esbuild and checks
 * which file system implementations, and how much of the Stream runtime,
 * each contains.
 *
 *   pnpm bundle
 *
 * `effect` is bundled as it is published: every top-level call in
 * `packages/effect/src` is annotated `#__PURE__`, as the package build's
 * `babel-plugin-annotate-pure-calls` step does to `dist`. The contract
 * (`src/FileSystem.ts` and its operations) is bundled as written, except in
 * the last row, where it is published the same way.
 *
 * An implementation is present when its `src/node/<op>.ts` module has bytes
 * in the output (esbuild's metafile); the Stream runtime is the bytes from
 * `Stream.ts`, `Channel.ts`, `Sink.ts` and their internals.
 */
import * as babel from "@babel/core"
import * as esbuild from "esbuild"
import * as fs from "node:fs"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const effectSource = path.resolve(root, "..", "..", "packages", "effect", "src") + path.sep
const operations = fs.readdirSync(path.join(root, "src", "node"))
  .filter((file) => file.endsWith(".ts") && !["index.ts", "internal.ts", "layer.ts"].includes(file))
  .map((file) => file.slice(0, -3))
  .sort()
const streamModules = ["Stream.ts", "Channel.ts", "Sink.ts", "internal/stream.ts", "internal/channel.ts"]
  .map((file) => path.join(effectSource, file))

interface Root {
  readonly entry: string
  readonly label: string
  readonly uses: ReadonlyArray<string>
  /** the most Stream-runtime bytes the bundle may hold */
  readonly stream: number
  readonly publishContract?: boolean
}

const roots: ReadonlyArray<Root> = [
  { entry: "main.ts", label: "two operation layers", uses: ["readFile", "writeFile"], stream: 2048 },
  { entry: "main-readonly.ts", label: "ReadOnly subset", uses: ["exists", "readFile", "stat"], stream: 2048 },
  { entry: "main-stream.ts", label: "one Stream operation", uses: ["stream"], stream: Infinity },
  { entry: "main-full.ts", label: "the record layer (control)", uses: operations, stream: Infinity },
  {
    entry: "main.ts",
    label: "two operation layers, contract published",
    uses: ["readFile", "writeFile"],
    stream: 0,
    publishContract: true
  }
]

const published = new Map<string, Promise<string>>()
const publish = (file: string) => {
  let code = published.get(file)
  if (code === undefined) {
    code = esbuild.transform(fs.readFileSync(file, "utf8"), { loader: "ts", format: "esm", target: "es2022" })
      .then((js) =>
        babel.transformAsync(js.code, {
          babelrc: false,
          configFile: false,
          plugins: ["babel-plugin-annotate-pure-calls"]
        })
      )
      .then((result) => result!.code!)
    published.set(file, code)
  }
  return code
}
const isContract = (file: string) => file.startsWith(path.join(root, "src", "FileSystem"))

let failures = 0
for (const entry of roots) {
  const result = await esbuild.build({
    entryPoints: [path.join(root, "src", entry.entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    write: false,
    outdir: path.join(root, "dist"),
    metafile: true,
    logLevel: "silent",
    plugins: [{
      name: "effect-as-published",
      setup(build) {
        build.onLoad(
          { filter: /\.ts$/ },
          async (args) =>
            args.path.startsWith(effectSource) || (entry.publishContract && isContract(args.path))
              ? { contents: await publish(args.path), loader: "js", resolveDir: path.dirname(args.path) }
              : undefined
        )
      }
    }]
  })
  const output = Object.values(result.metafile.outputs)[0]!
  const inputs = Object.entries(output.inputs)
    .filter(([, input]) => input.bytesInOutput > 0)
    .map(([file, input]) => [path.resolve(root, file), input.bytesInOutput] as const)
  const present = operations.filter((operation) =>
    inputs.some(([file]) => file === path.join(root, "src", "node", `${operation}.ts`))
  )
  const streamBytes = inputs.filter(([file]) => streamModules.includes(file)).reduce((total, [, n]) => total + n, 0)
  const ok = present.join() === [...entry.uses].sort().join() && streamBytes <= entry.stream
  if (!ok) failures++
  const summary = present.length === operations.length ? "all" : present.join(", ")
  console.log(
    `${ok ? "ok  " : "FAIL"} ${`${entry.entry} (${entry.label})`.padEnd(58)} ${
      `${(output.bytes / 1024).toFixed(1)} kB`.padStart(9)
    }  ${present.length}/${operations.length} implementations: ${summary}; Stream runtime ${streamBytes} B`
  )
}
if (failures > 0) process.exit(1)
console.log("\nOK: every bundle contains exactly the implementations its program uses")
