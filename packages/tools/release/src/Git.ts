import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Path from "effect/Path"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { ReleaseError } from "./Errors.ts"
import { findWorkspaceRoot, runCommand, runCommandOk } from "./Process.ts"

/**
 * The git operations the version-PR flow needs. The implementation shells out
 * to `git` with the identity CI configured; it never rewrites `main`.
 */
export class Git extends Context.Service<Git, {
  /** Full SHA of `HEAD`. */
  readonly headSha: Effect.Effect<string, ReleaseError>
  /** Creates or resets the local `branch` to `from` and checks it out. */
  readonly resetBranch: (branch: string, from: string) => Effect.Effect<void, ReleaseError>
  /** Stages every change and commits; `none` when the tree was clean. */
  readonly commitAll: (message: string) => Effect.Effect<Option.Option<string>, ReleaseError>
  /** `git push --force origin <branch>`. */
  readonly pushForce: (branch: string) => Effect.Effect<void, ReleaseError>
  /** `git checkout <ref>`; used to return to the original commit afterwards. */
  readonly checkout: (ref: string) => Effect.Effect<void, ReleaseError>
  /**
   * Full SHA of the last first-parent commit that touched `path`
   * (`git log -1 --first-parent --format=%H -- <path>`); fails when none did.
   * The publish flow uses it on `.changeset/ledger.yaml` to find the
   * "Version Packages" merge a staged release was built from.
   */
  readonly lastCommitTouching: (path: string) => Effect.Effect<string, ReleaseError>
  /**
   * `git show <ref>:<path>`; `none` when the path does not exist at `ref`.
   * The publish flow reads the release manifest from `origin/main` this way,
   * so "merged" is structural rather than a property of the checkout.
   */
  readonly showFile: (ref: string, path: string) => Effect.Effect<Option.Option<string>, ReleaseError>
  /**
   * Stages exactly `paths` and commits; `none` when they hold no change. The
   * publish PR commits only `.release/manifest.json` with this, so the
   * authorisation artifact can never carry an unrelated file.
   */
  readonly commitPaths: (
    message: string,
    paths: ReadonlyArray<string>
  ) => Effect.Effect<Option.Option<string>, ReleaseError>
}>()("@effect/release/Git") {
  static readonly layer: Layer.Layer<Git, never, ChildProcessSpawner | FileSystem.FileSystem | Path.Path> = Layer
    .effect(
      Git,
      Effect.gen(function*() {
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner
        const git = (args: ReadonlyArray<string>) =>
          runCommandOk("git", args, { cwd: root }).pipe(Effect.provideService(ChildProcessSpawner, spawner))

        const headSha = git(["rev-parse", "HEAD"]).pipe(Effect.map((stdout) => stdout.trim()))

        const commitStaged = Effect.fn("Git.commitStaged")(function*(message: string) {
          const staged = yield* runCommand("git", ["diff", "--cached", "--quiet"], { cwd: root }).pipe(
            Effect.provideService(ChildProcessSpawner, spawner)
          )
          if (staged.exitCode === 0) return Option.none<string>()
          if (staged.exitCode !== 1) {
            return yield* new ReleaseError({
              message: `git diff --cached --quiet exited ${staged.exitCode}: ${staged.stderr.trim()}`
            })
          }
          yield* git(["commit", "--message", message])
          return Option.some(yield* headSha)
        })

        const commitAll = Effect.fn("Git.commitAll")(function*(message: string) {
          yield* git(["add", "-A"])
          return yield* commitStaged(message)
        })

        return Git.of({
          headSha,
          resetBranch: (branch, from) => git(["checkout", "-B", branch, from]).pipe(Effect.asVoid),
          commitAll,
          pushForce: (branch) => git(["push", "--force", "origin", branch]).pipe(Effect.asVoid),
          checkout: (ref) => git(["checkout", ref]).pipe(Effect.asVoid),
          lastCommitTouching: (path) =>
            git(["log", "-1", "--first-parent", "--format=%H", "--", path]).pipe(
              Effect.flatMap((stdout) =>
                stdout.trim() === ""
                  ? new ReleaseError({ message: `No commit on the current branch touched ${path}` })
                  : Effect.succeed(stdout.trim())
              )
            ),
          showFile: (ref, path) =>
            Effect.gen(function*() {
              // Check the ref separately so a missing remote branch is not
              // mistaken for a missing manifest.
              yield* git(["rev-parse", "--verify", `${ref}^{commit}`])
              const shown = yield* runCommand("git", ["show", `${ref}:${path}`], { cwd: root }).pipe(
                Effect.provideService(ChildProcessSpawner, spawner)
              )
              if (shown.exitCode === 0) return Option.some(shown.stdout)
              if (
                shown.exitCode === 128 &&
                (shown.stderr.includes("does not exist in") || shown.stderr.includes("exists on disk, but not in"))
              ) {
                return Option.none<string>()
              }
              return yield* new ReleaseError({
                message: `git show ${ref}:${path} exited ${shown.exitCode}: ${(shown.stderr || shown.stdout).trim()}`
              })
            }),
          commitPaths: (message, paths) =>
            Effect.gen(function*() {
              if (paths.length === 0) {
                return yield* new ReleaseError({ message: "Cannot commit an empty path list" })
              }
              yield* git(["add", "--", ...paths])
              const staged = yield* runCommand("git", ["diff", "--cached", "--quiet", "--", ...paths], {
                cwd: root
              }).pipe(Effect.provideService(ChildProcessSpawner, spawner))
              if (staged.exitCode === 0) return Option.none<string>()
              if (staged.exitCode !== 1) {
                return yield* new ReleaseError({
                  message: `git diff --cached --quiet exited ${staged.exitCode}: ${staged.stderr.trim()}`
                })
              }
              // --only prevents an unrelated pre-staged path from becoming
              // part of the release authorisation commit.
              yield* git(["commit", "--only", "--message", message, "--", ...paths])
              return Option.some(yield* headSha)
            })
        })
      })
    )
}
