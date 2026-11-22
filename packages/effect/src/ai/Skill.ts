/**
 * Standalone Agent Skill value and schema for local agents and MCP servers.
 *
 * A `Skill` models an Agent Skill (https://agentskills.io/specification) as
 * plain data — validated YAML `frontmatter`, markdown `instructions`, and
 * supporting `files` — with `SKILL.md` as its serialization format via
 * {@link toFiles} and {@link fromFiles}.
 *
 * @stability unstable
 * @since 4.1.6
 */
import * as Cause from "../Cause.ts"
import * as Effect from "../Effect.ts"
import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as SkillInternal from "./internal/skill.ts"

/**
 * Schema for the YAML frontmatter of an Agent Skill's `SKILL.md`, as the
 * Agent Skills specification defines it (https://agentskills.io/specification).
 *
 * **Details**
 *
 * Fields the specification does not define are kept unchanged.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.6
 */
export const Frontmatter = Schema.StructWithRest(SkillInternal.FrontmatterFields, [Schema.JsonObject])

/**
 * The YAML frontmatter of an Agent Skill's `SKILL.md`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.6
 */
export type Frontmatter = typeof Frontmatter.Type

const Bytes = Schema.Uint8Array.annotate({
  toCodecJson: () =>
    Schema.link<Uint8Array<ArrayBufferLike>>()(
      Schema.Struct({ base64: Schema.Uint8ArrayFromBase64 }),
      SchemaTransformation.transform({
        decode: ({ base64 }) => base64,
        encode: (base64) => ({ base64 })
      })
    )
})

const SkillFiles = Schema.Record(Schema.String, Schema.Union([Schema.String, Bytes])).check(
  Schema.makeFilter((files) => {
    const path = Object.keys(files).find((path) => path === "SKILL.md" || !SkillInternal.isSafeRelativePath(path))
    return path === undefined || `Invalid skill file path "${path}"`
  })
)

/**
 * Schema and class for an Agent Skill bundle.
 *
 * **Details**
 *
 * Holds validated {@link Frontmatter}, markdown `instructions`, and supporting
 * `files` keyed by safe relative paths (excluding `SKILL.md`). When encoded
 * with `Schema.toCodecJson`, binary `Uint8Array` files are represented as
 * `{ base64: string }` so text and binary files stay distinct.
 *
 * @see {@link make} for constructing a skill
 * @see {@link toFiles} for rendering a skill to a file map including `SKILL.md`
 * @see {@link fromFiles} for parsing a skill from a file map containing `SKILL.md`
 *
 * @stability unstable
 * @category models
 * @since 4.1.6
 */
export class Skill extends Schema.Class<Skill>("effect/ai/Skill")({
  frontmatter: Frontmatter,
  instructions: Schema.String,
  files: SkillFiles
}) {}

/**
 * Constructs a validated {@link Skill}.
 *
 * **Gotchas**
 *
 * Throws a `Schema.SchemaError` when `frontmatter` fails validation or any
 * key in `files` is `"SKILL.md"` or an unsafe path. Use {@link fromFiles} or
 * `Schema.decodeUnknownEffect(Skill)` for untrusted input.
 *
 * @see {@link fromFiles} for effectful construction from a raw file map
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.6
 */
export const make = (options: {
  readonly frontmatter: Frontmatter
  readonly instructions: string
  readonly files?: Readonly<Record<string, string | Uint8Array>> | undefined
}): Skill => new Skill({ ...options, files: options.files ?? {} })

/**
 * Renders a {@link Skill} into a file map that includes the generated
 * `SKILL.md` along with all supporting files.
 *
 * **Details**
 *
 * Frontmatter keys and values are JSON-encoded so YAML edge cases round-trip
 * cleanly through {@link fromFiles}.
 *
 * @see {@link fromFiles} for parsing a file map back into a {@link Skill}
 *
 * @stability unstable
 * @category conversions
 * @since 4.1.6
 */
export const toFiles = (
  self: Skill
): { readonly "SKILL.md": string } & Readonly<Record<string, string | Uint8Array>> => {
  const frontmatter = Object.entries(self.frontmatter)
    .map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join("\n")
  return { "SKILL.md": `---\n${frontmatter}\n---\n\n${self.instructions}`, ...self.files }
}

const decodeSkill = Schema.decodeUnknownEffect(Skill)

/**
 * Parses a {@link Skill} from a file map containing `SKILL.md` and optional
 * supporting files.
 *
 * **Details**
 *
 * Fails with `Cause.IllegalArgumentError` when `SKILL.md` is missing, not
 * valid UTF-8, lacks a valid YAML frontmatter block, or fails {@link Skill}
 * schema validation.
 *
 * @see {@link toFiles} for the inverse conversion
 * @see {@link make} for constructing a skill from structured fields
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.6
 */
export const fromFiles = (
  files: Readonly<Record<string, string | Uint8Array>>
): Effect.Effect<Skill, Cause.IllegalArgumentError> =>
  Effect.suspend(() => {
    // Rest destructuring defines own properties, so a file named `__proto__` survives.
    const { "SKILL.md": skillMd, ...supportingFiles } = files
    if (skillMd === undefined) {
      return Effect.fail(new Cause.IllegalArgumentError("Skill is missing SKILL.md"))
    }
    const markdown = typeof skillMd === "string" ? skillMd : SkillInternal.decodeUtf8(skillMd)
    if (markdown === undefined) {
      return Effect.fail(new Cause.IllegalArgumentError("SKILL.md is not valid UTF-8"))
    }
    const parsed = SkillInternal.parseSkillMarkdown(markdown)
    if (parsed === undefined) {
      return Effect.fail(new Cause.IllegalArgumentError("SKILL.md is missing valid YAML frontmatter"))
    }
    return decodeSkill({ ...parsed, files: supportingFiles }).pipe(
      Effect.mapError((error) => new Cause.IllegalArgumentError(error.message))
    )
  })
