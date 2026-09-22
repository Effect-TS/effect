import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Path from "effect/Path"
// The published effect package exports this public barrel, not its source modules.
// oxlint-disable-next-line effect/no-import-from-barrel-package
import { ChildProcessSpawner } from "effect/unstable/process"
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
  static readonly layer: Layer.Layer<
    Git,
    never,
    ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
  > = Layer
    .effect(
      Git,
      Effect.gen(function*() {
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const git = (args: ReadonlyArray<string>) =>
          runCommandOk("git", args, { cwd: root }).pipe(
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
          )

        const headSha = git(["rev-parse", "HEAD"]).pipe(Effect.map((stdout) => stdout.trim()))

        /** Commits what is in the index (limited to `paths` when given); `none` when nothing is staged. */
        const commitStaged = Effect.fn("Git.commitStaged")(
          function*(message: string, paths: ReadonlyArray<string> = []) {
            const scope = paths.length === 0 ? [] : ["--", ...paths]
            const staged = yield* runCommand("git", ["diff", "--cached", "--quiet", ...scope], { cwd: root }).pipe(
              Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
            )
            if (staged.exitCode === 0) return Option.none<string>()
            if (staged.exitCode !== 1) {
              return yield* new ReleaseError({
                message: `git diff --cached --quiet exited ${staged.exitCode}: ${staged.stderr.trim()}`
              })
            }
            // --only keeps an unrelated pre-staged path out of a path-limited commit.
            yield* git(["commit", ...(paths.length === 0 ? [] : ["--only"]), "--message", message, ...scope])
            return Option.some(yield* headSha)
          }
        )

        const commitAll = (message: string) => git(["add", "-A"]).pipe(Effect.andThen(commitStaged(message)))

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
                Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
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
            paths.length === 0
              ? new ReleaseError({ message: "Cannot commit an empty path list" })
              : git(["add", "--", ...paths]).pipe(Effect.andThen(commitStaged(message, paths)))
        })
      })
    )
}

/** Runs `work`, then always, even on failure, checks the original `HEAD` back out. */
export const withRestoredHead = <A, E>(
  git: Git["Service"],
  work: Effect.Effect<A, E>
): Effect.Effect<A, E | ReleaseError> =>
  Effect.gen(function*() {
    const originalSha = yield* git.headSha
    return yield* work.pipe(Effect.ensuring(git.checkout(originalSha).pipe(Effect.orDie)))
  })
