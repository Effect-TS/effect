/** @internal */
import * as Yaml from "../../encoding/Yaml.ts"
import * as Mime from "../../http/Mime.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"

export const Frontmatter = Schema.Struct({
  /**
   * The skill's name: up to 64 lowercase letters, digits and single hyphens.
   */
  name: Schema.String.check(Schema.isMaxLength(64), Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
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
   * Additional string-valued metadata.
   */
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  /**
   * Tools requested by the skill. Hosts decide which permissions to grant.
   */
  "allowed-tools": Schema.optionalKey(Schema.String)
})

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

const parseFrontmatter = Option.liftThrowable((yaml: string): unknown =>
  // Frontmatter is JSON metadata; YAML's non-finite numbers become null.
  JSON.parse(JSON.stringify(Yaml.parse(yaml)))
)

export const parseDocument = (
  markdown: string
): { readonly frontmatter: Record<string, unknown>; readonly instructions: string } | undefined => {
  const match = FRONTMATTER.exec(markdown)
  if (match === null) return undefined
  const parsed = parseFrontmatter(match[1])
  if (Option.isNone(parsed) || !Predicate.isObject(parsed.value)) return undefined
  return {
    frontmatter: parsed.value,
    instructions: markdown.slice(match[0].length)
  }
}

// oxlint-disable-next-line no-control-regex
const UNSAFE_PATH_CHARACTER = /[\\\u0000-\u001f\u007f]/

export const isSafeRelativePath = (path: string): boolean =>
  !UNSAFE_PATH_CHARACTER.test(path) &&
  path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")

export const mimeTypeFor = (path: string): string => {
  // The MIME table classifies .ts as MPEG transport streams rather than scripts.
  if (/\.ts$/i.test(path)) return "text/x-typescript"
  return Option.getOrElse(Mime.getType(path), () => "application/octet-stream")
}

// Keeping BOMs makes re-encoded text match the original file bytes.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

export const decodeUtf8 = Option.liftThrowable((content: Uint8Array): string => utf8.decode(content))
