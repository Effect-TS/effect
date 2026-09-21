import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { createHash } from "node:crypto"
import { ReleaseError } from "./Errors.ts"
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

const compareNames = (a: { readonly name: string }, b: { readonly name: string }): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0

const sortPackages = (packages: ReadonlyArray<ManifestPackage>): ReadonlyArray<ManifestPackage> =>
  [...packages].sort(compareNames)

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
export const fromStaged = (input: {
  readonly tag: string
  readonly sourceSha: string
  readonly packages: ReadonlyArray<WorkspacePackage>
  readonly staged: ReadonlyArray<StagedItem>
}): Effect.Effect<ReleaseManifest, ReleaseError> =>
  Effect.gen(function*() {
    const publicPackages = input.packages.filter((pkg) => !pkg.private).sort(compareNames)
    const packages: Array<ManifestPackage> = []
    for (const pkg of publicPackages) {
      const items = input.staged.filter((item) => item.packageName === pkg.name)
      const stale = items.filter((item) => item.version !== pkg.version)
      if (stale.length > 0) {
        return yield* new ReleaseError({
          message: `Stale staged versions must be rejected before publishing: ${
            stale.map((item) => `${pkg.name}: staged ${item.version} (${item.id}), manifest ${pkg.version}`).join("; ")
          }`
        })
      }
      const matching = items.filter((item) => Option.isNone(item.tag) || item.tag.value === input.tag)
      if (matching.length === 0) {
        const otherTags = items.flatMap((item) => Option.isSome(item.tag) ? [`${item.tag.value} (${item.id})`] : [])
        return yield* new ReleaseError({
          message: otherTags.length > 0
            ? `${pkg.name}@${pkg.version} is staged under another dist-tag than ${input.tag}: ${otherTags.join(", ")}`
            : `${pkg.name}@${pkg.version} is not staged`
        })
      }
      if (matching.length > 1) {
        return yield* new ReleaseError({
          message: `${pkg.name}@${pkg.version} is staged more than once: ${matching.map((item) => item.id).join(", ")}`
        })
      }
      packages.push({ name: pkg.name, version: pkg.version, stageId: matching[0].id })
    }
    return { schema: SCHEMA_VERSION, tag: input.tag, sourceSha: input.sourceSha, packages }
  })

/**
 * Canonical JSON: two-space indentation, keys in the order `schema`, `tag`,
 * `sourceSha`, `packages`, each package as `name`, `version`, `stageId`,
 * packages sorted by name, single trailing newline. Deterministic: the same
 * manifest always encodes to the same bytes, which is what {@link identity}
 * hashes and what the publish PR commits.
 */
export const encode = (manifest: ReleaseManifest): string =>
  JSON.stringify(
    {
      schema: manifest.schema,
      tag: manifest.tag,
      sourceSha: manifest.sourceSha,
      packages: sortPackages(manifest.packages).map((pkg) => ({
        name: pkg.name,
        version: pkg.version,
        stageId: pkg.stageId
      }))
    },
    null,
    2
  ) + "\n"

const ManifestJson = Schema.fromJsonString(
  Schema.Struct({
    schema: Schema.Number,
    tag: Schema.String,
    sourceSha: Schema.String,
    packages: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        version: Schema.String,
        stageId: Schema.String
      })
    )
  })
)

const decodeManifestJson = Schema.decodeUnknownEffect(ManifestJson)

/**
 * Parses {@link encode} output. Fails with a `ReleaseError` on malformed JSON,
 * an unknown `schema`, a missing field, or a package list that is not sorted
 * by name (a hand-edited manifest must not slip through).
 */
export const decode = (text: string): Effect.Effect<ReleaseManifest, ReleaseError> =>
  Effect.gen(function*() {
    const json = yield* decodeManifestJson(text).pipe(
      Effect.mapError((cause) => new ReleaseError({ message: "Unexpected release manifest shape", cause }))
    )
    if (json.schema !== SCHEMA_VERSION) {
      return yield* new ReleaseError({ message: `Unsupported release manifest schema ${json.schema}` })
    }
    for (let index = 1; index < json.packages.length; index++) {
      if (compareNames(json.packages[index - 1], json.packages[index]) >= 0) {
        return yield* new ReleaseError({
          message: `Release manifest packages are not sorted by name at ${json.packages[index].name}`
        })
      }
    }
    return {
      schema: SCHEMA_VERSION,
      tag: json.tag,
      sourceSha: json.sourceSha,
      packages: json.packages.map((pkg) => ({ name: pkg.name, version: pkg.version, stageId: pkg.stageId }))
    }
  })

/**
 * The release identity: the first {@link IDENTITY_LENGTH} hex characters of
 * the SHA-256 of {@link encode}. It is what the publish PR body carries, what
 * a maintainer passes to `release publish --expect-identity`, and what ties
 * the merge authorisation to one exact manifest.
 */
export const identity = (manifest: ReleaseManifest): string =>
  createHash("sha256").update(encode(manifest)).digest("hex").slice(0, IDENTITY_LENGTH)
