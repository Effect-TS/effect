import type * as Effect from "effect/Effect"
import type { ReleaseError } from "./Errors.ts"
import { notImplemented, notImplementedEffect } from "./NotImplemented.ts"
import type { StagedItem } from "./Registry.ts"
import type { WorkspacePackage } from "./Workspace.ts"

/**
 * The release manifest is the reviewable, committed record of exactly what a
 * "Publish Packages" pull request authorises. It pins the complete package
 * set, the version of each, and the registry stage id of the uploaded
 * tarball, so that neither later pushes to `main` nor unrelated items in the
 * stage queue can change what gets published.
 *
 * It lives at {@link MANIFEST_PATH} on the publish branch and, once the
 * publish PR merges, on `main`. `publish` reads it from the checked-out
 * `main` and refuses to act on anything else.
 */
export interface ManifestPackage {
  readonly name: string
  readonly version: string
  /** Registry stage id (UUID) of the staged tarball for exactly this version. */
  readonly stageId: string
}

export interface ReleaseManifest {
  readonly schema: typeof SCHEMA_VERSION
  /** dist-tag every staged item was uploaded under (`rc` until 4.0 GA). */
  readonly tag: string
  /**
   * The commit on `main` that introduced these versions: the last first-parent
   * commit touching {@link LEDGER_PATH} (`pnpm version -r` writes the ledger, so
   * that is the "Version Packages" merge). The website deploys this revision.
   */
  readonly sourceSha: string
  /** Every public package of the release, sorted by name. */
  readonly packages: ReadonlyArray<ManifestPackage>
}

export const SCHEMA_VERSION = 1
export const MANIFEST_PATH = ".release/manifest.json"
export const LEDGER_PATH = ".changeset/ledger.yaml"

/** Length of {@link identity}: 16 hex characters of the SHA-256 of {@link encode}. */
export const IDENTITY_LENGTH = 16

/**
 * Builds the manifest for a staged release. `packages` is the workspace;
 * private packages are ignored. Every public package must have exactly one
 * staged item at its manifest version whose `tag` is absent or equal to
 * `tag`. Fails with a `ReleaseError` naming the package when a public package
 * has no such item ("not staged"), has more than one ("ambiguous"), or has a
 * staged item at a different version ("stale", mirroring `Routing`).
 * Staged items for names outside the workspace are ignored. The result is
 * sorted by package name.
 */
export const fromStaged = (_input: {
  readonly tag: string
  readonly sourceSha: string
  readonly packages: ReadonlyArray<WorkspacePackage>
  readonly staged: ReadonlyArray<StagedItem>
}): Effect.Effect<ReleaseManifest, ReleaseError> => notImplementedEffect("ReleaseManifest.fromStaged")

/**
 * Canonical JSON: two-space indentation, keys in the order `schema`, `tag`,
 * `sourceSha`, `packages`, each package as `name`, `version`, `stageId`,
 * packages sorted by name, single trailing newline. Deterministic: the same
 * manifest always encodes to the same bytes, which is what {@link identity}
 * hashes and what the publish PR commits.
 */
export const encode = (_manifest: ReleaseManifest): string => notImplemented("ReleaseManifest.encode")

/**
 * Parses {@link encode} output. Fails with a `ReleaseError` on malformed JSON,
 * an unknown `schema`, a missing field, or a package list that is not sorted
 * by name (a hand-edited manifest must not slip through).
 */
export const decode = (_text: string): Effect.Effect<ReleaseManifest, ReleaseError> =>
  notImplementedEffect("ReleaseManifest.decode")

/**
 * The release identity: the first {@link IDENTITY_LENGTH} hex characters of
 * the SHA-256 of {@link encode}. It is what the publish PR body carries, what
 * a maintainer passes to `release publish --expect-identity`, and what ties
 * the merge authorisation to one exact manifest.
 */
export const identity = (_manifest: ReleaseManifest): string => notImplemented("ReleaseManifest.identity")
