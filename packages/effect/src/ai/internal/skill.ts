/**
 * Agent Skill rules shared by `Skill`, `McpSchema` and the MCP Skills
 * extension: the frontmatter fields, the name rule, path safety and
 * `SKILL.md` parsing.
 */
import * as Yaml from "../../encoding/Yaml.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"

// The Agent Skills `name` rule: lowercase letters, digits and single hyphens,
// neither leading nor trailing, at most 64 characters.
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * @internal
 */
export const isSkillName = (name: string): boolean => name.length <= 64 && SKILL_NAME.test(name)

/**
 * The frontmatter fields the Agent Skills specification defines. `Skill` and
 * `McpSchema` add their own rest record.
 *
 * @internal
 */
export const FrontmatterFields = Schema.Struct({
  /**
   * 1 to 64 lowercase letters, digits and hyphens, with no leading, trailing
   * or consecutive hyphen. It names the directory holding `SKILL.md`.
   */
  name: Schema.String.check(Schema.isMaxLength(64), Schema.isPattern(SKILL_NAME)),
  /**
   * What the skill does and when to use it, in 1 to 1024 characters.
   */
  description: Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(1024)),
  /**
   * The skill's license, or the name of a bundled license file.
   */
  license: Schema.optionalKey(Schema.String),
  /**
   * Environment requirements, in 1 to 500 characters.
   */
  compatibility: Schema.optionalKey(Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(500))),
  /**
   * Additional properties not defined by the specification.
   */
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  /**
   * Space-separated tools the skill asks to run without approval. Hosts must
   * ignore it for a skill served over MCP unless the user approved the grant.
   */
  "allowed-tools": Schema.optionalKey(Schema.String)
})

/**
 * Whether `path` is a safe relative file path inside a skill bundle.
 *
 * @internal
 */
export const isSafeRelativePath = (path: string): boolean =>
  path !== "" &&
  !path.includes("\\") &&
  path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")

// `ignoreBOM` keeps a leading BOM in the decoded text, so re-encoding the text
// reproduces exactly the bytes the manifest digest covers.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

/**
 * Strict UTF-8 decoding, or `undefined` when the bytes are not valid UTF-8.
 *
 * @internal
 */
export const decodeUtf8 = (content: Uint8Array): string | undefined => {
  try {
    return utf8.decode(content)
  } catch {
    return undefined
  }
}

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * Parses a `SKILL.md` file into its YAML frontmatter mapping and instruction
 * body, or `undefined` when the file does not begin with a frontmatter block
 * holding a YAML mapping.
 *
 * @internal
 */
export const parseSkillMarkdown = (
  markdown: string
): { readonly frontmatter: Record<string, unknown>; readonly instructions: string } | undefined => {
  const match = FRONTMATTER.exec(markdown)
  if (match === null) return undefined
  try {
    const parsed = Yaml.parse(match[1])
    if (!Predicate.isObject(parsed)) return undefined
    // The frontmatter is listed as JSON, so keep only what JSON carries:
    // `.inf` and `.nan` become `null`.
    const frontmatter: Record<string, unknown> = JSON.parse(JSON.stringify(parsed))
    const instructions = markdown.slice(match[0].length).replace(/^\r?\n/, "")
    return { frontmatter, instructions }
  } catch {
    return undefined
  }
}

/**
 * The YAML frontmatter of a `SKILL.md`, or `undefined` when the file does not
 * begin with a frontmatter block holding a YAML mapping.
 *
 * @internal
 */
export const parseFrontmatter = (markdown: string): Record<string, unknown> | undefined =>
  parseSkillMarkdown(markdown)?.frontmatter
