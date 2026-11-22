/**
 * Shared Agent Skill parsing and path validation helpers used by `Skill` and
 * MCP skill registration.
 */
import * as Yaml from "../../encoding/Yaml.ts"
import * as Predicate from "../../Predicate.ts"

/**
 * Whether `path` is a safe relative file path inside a skill bundle.
 *
 * @internal
 */
export const isSafeRelativePath = (path: string): boolean =>
  path !== "" &&
  !path.includes("\\") &&
  path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * The YAML frontmatter of a `SKILL.md`, or `undefined` when the file does not
 * begin with a frontmatter block holding a YAML mapping.
 *
 * @internal
 */
export const parseFrontmatter = (markdown: string): Record<string, unknown> | undefined =>
  parseSkillMarkdown(markdown)?.frontmatter

/**
 * Parses a `SKILL.md` file into its YAML frontmatter mapping and instruction
 * body, or `undefined` when the file does not begin with a valid YAML
 * frontmatter mapping.
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
