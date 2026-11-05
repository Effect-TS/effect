/**
 * Immutable Agent Skills for local consumption and optional publication.
 *
 * Create a skill from structured instructions or import its exact files. Local
 * reads need no services. Compute a manifest with `Digest` when publishing or
 * comparing deployed content. Tool permissions, model messages and filesystem
 * discovery remain the consumer's responsibility.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as ByteSize from "../ByteSize.ts"
import * as Digest from "../crypto/Digest.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as Inspectable from "../Inspectable.ts"
import * as Option from "../Option.ts"
import * as Pipeable from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as Internal from "./internal/skill.ts"

/**
 * Schema for complete Agent Skills frontmatter, retaining JSON-valued extension
 * fields. A skill's requested tools do not grant authority to execute them.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Frontmatter = Schema.StructWithRest(Internal.Frontmatter, [Schema.JsonObject])

/**
 * Complete frontmatter of a prepared skill.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Frontmatter = typeof Frontmatter.Type

/**
 * Schema for a skill file's relative path, MIME label and byte size.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const FileMetadata = Schema.Struct({
  path: Schema.String,
  mimeType: Schema.String,
  size: Schema.Natural
})

/**
 * Metadata for one file of a prepared skill.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type FileMetadata = typeof FileMetadata.Type

/**
 * Schema for a skill file's metadata and SHA-256 digest of its exact bytes.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const ManifestFile = Schema.Struct({
  ...FileMetadata.fields,
  digest: Schema.String.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/))
})

/**
 * A file described by an integrity manifest.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type ManifestFile = typeof ManifestFile.Type

/**
 * Schema for the persistence shape of a versioned skill manifest.
 *
 * **Details**
 *
 * The schema validates field shapes and digest syntax. {@link manifest} produces
 * complete manifests sorted by exact relative path. Decoding this schema does
 * not check path safety, uniqueness, completeness or ordering.
 *
 * Compare manifests with `Schema.toEquivalence(Manifest)`. The comparison covers
 * supporting files and MIME labels as well as the entry document. A manifest
 * describes content but does not retain the file bytes needed to restore it.
 *
 * @see {@link manifest}
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Manifest = Schema.Struct({
  version: Schema.Literal(1),
  files: Schema.Array(ManifestFile)
})

/**
 * Integrity metadata for all files of a skill.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Manifest = typeof Manifest.Type

/**
 * Expected failure when preparing a skill from invalid content or limits.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class SkillError extends Schema.TaggedError<SkillError>("effect/ai/Skill/SkillError")("SkillError", {
  reason: Schema.Literals([
    "InvalidInput",
    "InvalidFrontmatter",
    "InvalidEntry",
    "InvalidPath",
    "PathConflict",
    "LimitExceeded"
  ]),
  message: Schema.String,
  path: Schema.optionalKey(Schema.String)
}) {}

/**
 * Expected failure when a file path is invalid, absent or not valid UTF-8.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class SkillReadError
  extends Schema.TaggedError<SkillReadError>("effect/ai/Skill/SkillReadError")("SkillReadError", {
    reason: Schema.Literals(["InvalidPath", "NotFound", "InvalidUtf8"]),
    path: Schema.String,
    message: Schema.String
  })
{}

/**
 * File content supplied as UTF-8 text or bytes, optionally with a MIME label.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type FileInput = string | Uint8Array | {
  readonly content: string | Uint8Array
  readonly mimeType?: string | undefined
}

/**
 * Preparation bounds shared by structured authoring and exact-file imports.
 * Defaults are 512 files and 16 MiB, including `SKILL.md`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Limits {
  readonly maxFiles?: number | undefined
  readonly maxBytes?: ByteSize.Input | undefined
}

const TypeId = "~effect/ai/Skill" as const

/**
 * An immutable skill with private file storage, validated frontmatter and the
 * instruction body after the entry document's closing frontmatter delimiter.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Skill extends Pipeable.Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly frontmatter: Frontmatter
  readonly instructions: string
  readonly files: ReadonlyArray<FileMetadata>
}

const Proto = Object.freeze({
  ...Pipeable.Prototype,
  ...Inspectable.BaseProto,
  toJSON(this: Skill) {
    return { _id: "effect/ai/Skill", name: this.frontmatter.name, fileCount: this.files.length }
  }
})

const storage = new WeakMap<Skill, ReadonlyMap<string, Uint8Array>>()
const encoder = new TextEncoder()
const FileInputSchema = Schema.Union([
  Schema.String,
  Schema.Uint8Array,
  Schema.Struct({
    content: Schema.Union([Schema.String, Schema.Uint8Array]),
    mimeType: Schema.optional(Schema.String)
  })
])
const FileRecord = Schema.Record(Schema.String, FileInputSchema)
const FrontmatterText = Schema.fromJsonString(Frontmatter, {
  space: 2,
  replacer: (_, value) =>
    Predicate.isObject(value)
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]))
      : value
})

const decodeFileInput = Schema.decodeUnknownResult(FileInputSchema)
const decodeFileRecord = Schema.decodeUnknownResult(FileRecord)
const encodeFrontmatterText = Schema.encodeResult(FrontmatterText)
const decodeFrontmatter = Schema.decodeUnknownEffect(Frontmatter)

const fail = (reason: SkillError["reason"], message: string, path?: string) =>
  Effect.fail(new SkillError({ reason, message, ...(path === undefined ? {} : { path }) }))

const freezeJson = (value: unknown): void => {
  if (Predicate.isObjectOrArray(value)) {
    for (const child of Object.values(value)) freezeJson(child)
    Object.freeze(value)
  }
}

const prepareFiles = (
  files: Readonly<Record<string, FileInput>>,
  limits: Limits | undefined
): Effect.Effect<Skill, SkillError> => {
  const maxFiles = limits?.maxFiles ?? 512
  const requestedBytes = limits?.maxBytes
  const maxBytes = requestedBytes === undefined
    ? Option.some(ByteSize.mebibytes(16))
    : ByteSize.fromInput(requestedBytes)
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 1 || Option.isNone(maxBytes)) {
    return fail("InvalidInput", "Preparation limits must be a positive safe file count and a non-negative byte count")
  }
  const entries = Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  if (entries.length > maxFiles) {
    return fail("LimitExceeded", `it has ${entries.length} files; the limit is ${maxFiles}`)
  }
  const paths = new Set(entries.map(([path]) => path))
  for (const [path] of entries) {
    if (!Internal.isSafeRelativePath(path)) {
      return fail("InvalidPath", `the file path "${path}" escapes the skill`, path)
    }
    const segments = path.split("/")
    for (let depth = 1; depth < segments.length; depth++) {
      if (paths.has(segments.slice(0, depth).join("/"))) {
        return fail("PathConflict", `the file "${path}" has a parent that is also a file`, path)
      }
    }
  }
  const snapshots = new Map<string, Uint8Array>()
  const metadata: Array<FileMetadata> = []
  let totalBytes = BigInt(0)
  for (const [path, input] of entries) {
    const parsed = decodeFileInput(input)
    if (Result.isFailure(parsed)) return fail("InvalidInput", parsed.failure.message, path)
    const file = parsed.success
    const { content, mimeType } = typeof file === "string" || file instanceof Uint8Array
      ? { content: file, mimeType: undefined }
      : file
    const bytes = typeof content === "string" ? encoder.encode(content) : content
    totalBytes += BigInt(bytes.byteLength)
    if (totalBytes > ByteSize.toBigInt(maxBytes.value)) {
      return fail("LimitExceeded", `it has more than ${maxBytes.value} bytes`, path)
    }
    snapshots.set(path, new Uint8Array(bytes))
    metadata.push(Object.freeze({ path, mimeType: mimeType ?? Internal.mimeTypeFor(path), size: bytes.byteLength }))
  }
  const entry = snapshots.get("SKILL.md")
  if (entry === undefined) return fail("InvalidEntry", "SKILL.md is missing", "SKILL.md")
  const entryText = Internal.decodeUtf8(entry)
  if (Option.isNone(entryText)) return fail("InvalidEntry", "SKILL.md is not valid UTF-8", "SKILL.md")
  const document = Internal.parseDocument(entryText.value)
  if (document === undefined) {
    return fail("InvalidEntry", "SKILL.md must begin with YAML frontmatter holding a mapping", "SKILL.md")
  }
  // All caller-owned bytes are captured before schema decoding can yield.
  return Effect.map(
    decodeFrontmatter(document.frontmatter).pipe(
      Effect.mapError((error) =>
        new SkillError({
          reason: "InvalidFrontmatter",
          message: `the frontmatter is not valid Agent Skills frontmatter: ${error.message}`,
          path: "SKILL.md"
        })
      )
    ),
    (frontmatter) => {
      freezeJson(frontmatter)
      const skill: Skill = Object.freeze(Object.assign(Object.create(Proto), {
        [TypeId]: TypeId,
        frontmatter,
        instructions: document.instructions,
        files: Object.freeze(metadata)
      }))
      storage.set(skill, snapshots)
      return skill
    }
  )
}

/**
 * Imports a skill from its exact files, preserving byte content, BOMs and line
 * endings. Supporting file paths are literal keys relative to the skill root.
 *
 * **Gotchas**
 *
 * Inputs are snapshotted when the Effect executes. Reexecuting it may capture
 * newer caller data; retain the yielded value to share one snapshot. Imported
 * YAML metadata is JSON-normalized, while file bytes remain unchanged.
 *
 * @see {@link make} for structured authoring
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const fromFiles = (
  files: { readonly "SKILL.md": FileInput } & Readonly<Record<string, FileInput>>,
  options?: { readonly limits?: Limits | undefined }
): Effect.Effect<Skill, SkillError> => Effect.suspend(() => prepareFiles(files, options?.limits))

/**
 * Creates a skill from frontmatter, instructions and optional supporting files,
 * generating one `SKILL.md` with JSON flow syntax inside YAML delimiters.
 *
 * **Details**
 *
 * Construction needs no services. The generated document uses LF delimiters,
 * sorted frontmatter object keys and the supplied instruction body without
 * trimming. Supporting files cannot define another `SKILL.md`.
 *
 * **Example** (Authoring and reading a local procedure)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Skill } from "effect/ai"
 *
 * const policy = await Effect.runPromise(Effect.gen(function*() {
 *   const refunds = yield* Skill.make({
 *     frontmatter: { name: "refunds", description: "Process customer refunds" },
 *     instructions: "Read references/policy.md before issuing a refund.",
 *     files: { "references/policy.md": "Request approval above CHF 500." }
 *   })
 *   return yield* Skill.readText(refunds, "references/policy.md")
 * }))
 *
 * policy // => "Request approval above CHF 500."
 * ```
 *
 * @see {@link fromFiles} for exact-file imports
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = (options: {
  readonly frontmatter: Frontmatter
  readonly instructions: string
  readonly files?: Readonly<Record<string, FileInput>> | undefined
  readonly limits?: Limits | undefined
}): Effect.Effect<Skill, SkillError> =>
  Effect.suspend(() => {
    if (Object.hasOwn(options.files ?? {}, "SKILL.md")) {
      return fail("InvalidEntry", "Supporting files cannot define SKILL.md", "SKILL.md")
    }
    if (typeof options.instructions !== "string") return fail("InvalidInput", "Instructions must be UTF-8 text")
    const instructions = Internal.decodeUtf8(encoder.encode(options.instructions))
    if (Option.isNone(instructions) || instructions.value !== options.instructions) {
      return fail("InvalidInput", "Instructions must be lossless UTF-8 text")
    }
    const frontmatter = encodeFrontmatterText(options.frontmatter)
    if (Result.isFailure(frontmatter)) {
      return fail(
        "InvalidFrontmatter",
        `the frontmatter is not valid Agent Skills frontmatter: ${frontmatter.failure.message}`
      )
    }
    const files = decodeFileRecord(options.files ?? {})
    if (Result.isFailure(files)) return fail("InvalidInput", files.failure.message)
    return prepareFiles({
      ...files.success,
      "SKILL.md": `---\n${frontmatter.success}\n---\n${options.instructions}`
    }, options.limits)
  })

const fileBytes = (self: Skill, path: string): Effect.Effect<Uint8Array, SkillReadError> => {
  if (!Internal.isSafeRelativePath(path)) {
    return Effect.fail(
      new SkillReadError({ reason: "InvalidPath", path, message: "Expected a relative skill file path" })
    )
  }
  const bytes = storage.get(self)?.get(path)
  return bytes === undefined
    ? Effect.fail(new SkillReadError({ reason: "NotFound", path, message: "No such skill file" }))
    : Effect.succeed(bytes)
}

/**
 * Reads an independent copy of one file's bytes by exact relative path.
 *
 * @see {@link readText} for strict UTF-8 decoding
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const readBytes: {
  (self: Skill, path: string): Effect.Effect<Uint8Array, SkillReadError>
  (path: string): (self: Skill) => Effect.Effect<Uint8Array, SkillReadError>
} = dual(
  2,
  (self: Skill, path: string) =>
    Effect.suspend(() => Effect.map(fileBytes(self, path), (bytes) => new Uint8Array(bytes)))
)

/**
 * Reads one file as strict UTF-8, preserving BOMs and line endings independently
 * of its MIME label. Invalid UTF-8 fails instead of inserting replacement text.
 *
 * @see {@link readBytes} for binary content
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const readText: {
  (self: Skill, path: string): Effect.Effect<string, SkillReadError>
  (path: string): (self: Skill) => Effect.Effect<string, SkillReadError>
} = dual(2, (self: Skill, path: string) =>
  Effect.suspend(() =>
    Effect.flatMap(fileBytes(self, path), (bytes) => {
      const text = Internal.decodeUtf8(bytes)
      return Option.isSome(text)
        ? Effect.succeed(text.value)
        : Effect.fail(new SkillReadError({ reason: "InvalidUtf8", path, message: "File is not valid UTF-8" }))
    })
  ))

/**
 * Computes a versioned manifest over every file's exact bytes using the supplied
 * `Digest` service. Each invocation recomputes hashes; local reads do not hash.
 *
 * **Details**
 *
 * Digest implementations receive independent byte copies. The manifest includes
 * MIME metadata so a rendering change is visible to version comparisons.
 *
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const manifest: (self: Skill) => Effect.Effect<Manifest, never, Digest.Digest> = Effect.fnUntraced(
  function*(self) {
    const digest = yield* Digest.Digest
    const files = yield* Effect.forEach(self.files, (file) => {
      const bytes = storage.get(self)?.get(file.path)
      if (bytes === undefined) return Effect.die(new Error("Invalid Skill storage"))
      return Effect.map(
        digest.digestHex(Digest.sha256, new Uint8Array(bytes)),
        (hex) => Object.freeze({ ...file, digest: `sha256:${hex}` })
      )
    })
    return Object.freeze({ version: 1, files: Object.freeze(files) })
  }
)
