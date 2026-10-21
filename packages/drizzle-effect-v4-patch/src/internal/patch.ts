import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Schema from "effect/Schema"

const drizzleVersion = "1.0.0-rc.4"
const dependency = `drizzle-orm@${drizzleVersion}`
const filename = `${dependency}.patch`
const patchPath = `patches/${filename}`
const Dependencies = Schema.Record(Schema.String, Schema.String)

const Manifest = Schema.fromJsonString(
  Schema.StructWithRest(
    Schema.Struct({
      packageManager: Schema.optionalKey(Schema.String),
      patchedDependencies: Schema.optionalKey(Dependencies)
    }),
    [Schema.Record(Schema.String, Schema.Unknown)]
  ),
  { space: 2 }
)

const InstalledPackage = Schema.fromJsonString(
  Schema.Struct({ name: Schema.Literal("drizzle-orm"), version: Schema.String })
)

export class PatchError extends Schema.TaggedError<PatchError>()("PatchError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect())
}) {}

const findProject = Effect.fnUntraced(function*(directory: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  let current = path.resolve(directory)

  while (true) {
    if (
      (yield* fs.exists(path.join(current, "bun.lock"))) ||
      (yield* fs.exists(path.join(current, "bun.lockb")))
    ) {
      return current
    }
    const parent = path.dirname(current)

    if (parent === current) {
      return yield* PatchError.make({
        message: "No Bun lockfile found. Install your project's dependencies with Bun first."
      })
    }
    current = parent
  }
})

const requireSupportedDrizzle = Effect.fnUntraced(function*(
  directory: string,
  root: string
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  let current = path.resolve(directory)

  while (true) {
    const file = path.join(current, "node_modules/drizzle-orm/package.json")

    if (yield* fs.exists(file)) {
      const installed = yield* Schema.decodeEffect(InstalledPackage)(
        yield* fs.readFileString(file)
      )

      if (installed.version !== drizzleVersion) {
        return yield* PatchError.make({
          message: `Unsupported drizzle-orm ${installed.version}. This patch is verified only for ${drizzleVersion}.`
        })
      }

      return
    }
    if (current === root) {
      return yield* PatchError.make({
        message: "drizzle-orm is not installed here. Run from the workspace that depends on it, or pass --dir."
      })
    }
    current = path.dirname(current)
  }
})

/** Persist a native Bun patch; Bun owns installed files, cache isolation, and the lockfile. */
export const configure = Effect.fn("drizzlePatch.configure")(
  function*(directory: string, assets: URL, action: "patch" | "unpatch") {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const root = yield* findProject(directory)
    const manifestPath = path.join(root, "package.json")
    const original = yield* fs.readFileString(manifestPath)
    const manifest = yield* Schema.decodeEffect(Manifest)(original)

    if (manifest.packageManager !== undefined && !manifest.packageManager.startsWith("bun@")) {
      return yield* PatchError.make({
        message: "Only Bun projects are supported by this patch CLI."
      })
    }
    const patches = { ...manifest.patchedDependencies }
    const existing = patches[dependency]

    if (existing !== undefined && existing !== patchPath) {
      return yield* PatchError.make({
        message: `An existing patch for ${dependency} is configured at ${existing}. Merge the patches manually.`
      })
    }
    const bundledPath = yield* path.fromFileUrl(new URL(filename, assets))
    const expected = yield* fs.readFileString(bundledPath)
    const destination = path.join(root, patchPath)
    const exists = yield* fs.exists(destination)

    if (exists && (yield* fs.readFileString(destination)) !== expected) {
      return yield* PatchError.make({
        message: `${patchPath} has different contents. Resolve it manually; no files were changed.`
      })
    }
    if (action === "patch") {
      yield* requireSupportedDrizzle(directory, root)
      if (!exists) {
        yield* fs.makeDirectory(path.dirname(destination), { recursive: true })
        yield* fs.writeFileString(destination, expected, { flag: "wx" })
      }
      patches[dependency] = patchPath
    } else {
      delete patches[dependency]
    }
    if (
      (action === "patch" && existing === undefined) ||
      (action === "unpatch" && existing !== undefined)
    ) {
      const updated = { ...manifest }

      if (Object.keys(patches).length === 0) delete updated.patchedDependencies
      else updated.patchedDependencies = patches
      const encoded = yield* Schema.encodeEffect(Manifest)(updated)

      yield* fs.writeFileString(manifestPath, `${encoded}\n`)
    }

    // Retain the patch file until installation succeeds so a failed install can be retried.
    const child = yield* spawner.spawn(
      ChildProcess.make("bun", ["install"], { cwd: root, stdout: "inherit", stderr: "inherit" })
    )

    const code = yield* child.exitCode

    if (code !== ChildProcessSpawner.ExitCode(0)) {
      return yield* PatchError.make({
        message: `bun install exited ${code}. Configuration was saved; rerun this command to finish.`
      })
    }
    if (action === "unpatch" && exists) yield* fs.remove(destination)

    return action === "patch"
      ? `Patched ${dependency}. Commit package.json, the Bun lockfile, and ${patchPath}.`
      : "Removed the temporary Drizzle patch. Commit package.json, the Bun lockfile, and the patch deletion."
  },
  Effect.scoped,
  Effect.catchCause((cause) =>
    Effect.failCause(
      Cause.map(cause, (error) =>
        error._tag === "PatchError"
          ? error
          : PatchError.make({
            message: "Could not configure the Drizzle patch; check project files and permissions.",
            cause: error
          }))
    )
  )
)
