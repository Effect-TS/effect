/**
 * The Skills extension (SEP-2640): its wire vocabulary, the catalog behind a
 * static skill, and the handlers shared by the sessionful adapters.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Digest from "../../crypto/Digest.ts"
import * as Effect from "../../Effect.ts"
import * as Yaml from "../../encoding/Yaml.ts"
import * as Rpc from "../../rpc/Rpc.ts"
import * as RpcGroup from "../../rpc/RpcGroup.ts"
import * as Schema from "../../Schema.ts"
import * as PublicMcpSchema from "../McpSchema.ts"
import type * as McpCore from "./mcpCore.ts"
import * as McpProtocol from "./mcpProtocol.ts"
import * as Legacy from "./mcpSchema/v2024_11_05.ts"
import * as Stateless from "./mcpSchema/v2026_07_28.ts"

/**
 * @internal
 */
export const EXTENSION_ID = "io.modelcontextprotocol/skills"

/**
 * @internal
 */
export const DIRECTORY_MIME_TYPE = "inode/directory"

/**
 * @internal
 */
export const MAX_FILES_PER_SKILL = 512

/**
 * @internal
 */
export const MAX_BYTES_PER_SKILL = 16 * 1024 * 1024

/**
 * Adds the extension declaration while any skill is registered. Declaring it
 * commits the server to `skills/list`, `skills/get` and, through
 * `directoryRead`, `resources/directory/read`.
 *
 * @internal
 */
export const declareExtension = <A>(
  extensions: Readonly<Record<string, A>> | undefined,
  servesSkills: boolean
): Readonly<Record<string, A | { readonly directoryRead: true }>> | undefined =>
  servesSkills ? { ...extensions, [EXTENSION_ID]: { directoryRead: true } } : extensions

// =============================================================================
// Wire schemas
// =============================================================================

const SkillResource = Schema.Struct({
  uri: Schema.String,
  digest: Schema.String,
  size: Schema.Int
})

const Skill = Schema.Struct({
  uri: Schema.String,
  frontmatter: Legacy.UnknownObject,
  resources: Schema.Union([Schema.Array(SkillResource), Schema.Literal("dynamic")])
})

const DirectoryChild = Schema.Struct({
  uri: Schema.String,
  name: Schema.String,
  mimeType: Schema.String
})

/**
 * @internal
 */
export class LegacyListSkills extends Rpc.make("skills/list", {
  success: Schema.Struct({ ...Legacy.PaginatedResult.fields, skills: Schema.Array(Skill) }),
  error: Legacy.McpError,
  payload: Schema.UndefinedOr(Legacy.PaginatedRequest)
}) {}

/**
 * @internal
 */
export class LegacyGetSkill extends Rpc.make("skills/get", {
  success: Schema.Struct({ ...Legacy.ResultMeta.fields, skill: Skill }),
  error: Legacy.McpError,
  payload: { ...Legacy.RequestMeta.fields, uri: Schema.String }
}) {}

/**
 * @internal
 */
export class LegacyReadResourceDirectory extends Rpc.make("resources/directory/read", {
  success: Schema.Struct({ ...Legacy.PaginatedResult.fields, resources: Schema.Array(DirectoryChild) }),
  error: Legacy.McpError,
  payload: { ...Legacy.PaginatedRequest.fields, uri: Schema.String }
}) {}

/**
 * The extension's methods on revisions before 2026-07-28, which have no
 * result caching attributes.
 *
 * @internal
 */
export class LegacyRpcs extends RpcGroup.make(LegacyListSkills, LegacyGetSkill, LegacyReadResourceDirectory) {}

/**
 * @internal
 */
export const ListSkillsResult = Schema.StructWithRest(
  Schema.Struct({ ...Stateless.PaginatedResult, ...Stateless.CacheableResult, skills: Schema.Array(Skill) }),
  [Stateless.UnknownObject]
)

/**
 * @internal
 */
export class ListSkills extends Rpc.make("skills/list", {
  success: ListSkillsResult,
  error: Stateless.McpError,
  payload: Stateless.PaginatedRequestParams
}) {}

/**
 * @internal
 */
export const GetSkillResult = Schema.StructWithRest(
  Schema.Struct({ ...Stateless.CacheableResult, skill: Skill }),
  [Stateless.UnknownObject]
)

/**
 * @internal
 */
export class GetSkill extends Rpc.make("skills/get", {
  success: GetSkillResult,
  error: Stateless.McpError,
  payload: { ...Stateless.RequestParams.fields, uri: Schema.String }
}) {}

/**
 * @internal
 */
export const ReadResourceDirectoryResult = Schema.StructWithRest(
  Schema.Struct({
    ...Stateless.PaginatedResult,
    ...Stateless.CacheableResult,
    resources: Schema.Array(DirectoryChild)
  }),
  [Stateless.UnknownObject]
)

/**
 * @internal
 */
export class ReadResourceDirectory extends Rpc.make("resources/directory/read", {
  success: ReadResourceDirectoryResult,
  error: Stateless.McpError,
  payload: { ...Stateless.PaginatedRequestParams, uri: Schema.String }
}) {}

/**
 * The extension's methods on revision 2026-07-28.
 *
 * @internal
 */
export class StatelessRpcs extends RpcGroup.make(ListSkills, GetSkill, ReadResourceDirectory) {}

// =============================================================================
// Handlers
// =============================================================================

const methodNotFound = (method: string) =>
  new McpProtocol.ProtocolError({
    code: PublicMcpSchema.METHOD_NOT_FOUND_ERROR_CODE,
    message: `Method not found: ${method}`
  })

// Every skill fits on one page, so the server never issues a cursor.
const unknownCursor = new McpProtocol.ProtocolError({
  code: PublicMcpSchema.INVALID_PARAMS_ERROR_CODE,
  message: "Unknown cursor"
})

/**
 * Fails with `Method not found` while no skill is registered, as a server
 * that does not declare the extension.
 *
 * @internal
 */
export const requireSkills = (core: McpCore.McpCore, method: string) =>
  Effect.flatMap(
    core.registrationPresence,
    (presence) => presence.skills ? Effect.void : Effect.fail(methodNotFound(method))
  )

/**
 * @internal
 */
export const rejectCursor = (cursor: string | undefined) =>
  cursor === undefined ? Effect.void : Effect.fail(unknownCursor)

/**
 * Handlers for {@link LegacyRpcs}, for the sessionful adapters.
 *
 * @internal
 */
export const legacyHandlers = (core: McpCore.McpCore) => ({
  "skills/list": Effect.fnUntraced(function*(request: typeof LegacyListSkills.payloadSchema.Type) {
    yield* requireSkills(core, "skills/list")
    yield* rejectCursor(request?.cursor)
    const client = yield* PublicMcpSchema.McpServerClient
    const skills = yield* core.skills.list(McpProtocol.invocationFromClient(client))
    return { skills }
  }),
  "skills/get": Effect.fnUntraced(function*(request: typeof LegacyGetSkill.payloadSchema.Type) {
    yield* requireSkills(core, "skills/get")
    const client = yield* PublicMcpSchema.McpServerClient
    const skill = yield* core.skills.get(request.uri, McpProtocol.invocationFromClient(client)).pipe(
      Effect.mapError(McpProtocol.ProtocolError.fromFeature)
    )
    return { skill }
  }),
  "resources/directory/read": Effect.fnUntraced(function*(
    request: typeof LegacyReadResourceDirectory.payloadSchema.Type
  ) {
    yield* requireSkills(core, "resources/directory/read")
    yield* rejectCursor(request.cursor)
    const client = yield* PublicMcpSchema.McpServerClient
    const resources = yield* core.skills.readDirectory(request.uri, McpProtocol.invocationFromClient(client)).pipe(
      Effect.mapError(McpProtocol.ProtocolError.fromFeature)
    )
    return { resources }
  })
})

// =============================================================================
// Static skills
// =============================================================================

/**
 * A file of a static skill as handed in, `SKILL.md` included, with its path
 * relative to the skill root.
 *
 * @internal
 */
export interface SourceFile {
  readonly path: string
  readonly content: Uint8Array
  readonly mimeType?: string | undefined
}

/**
 * A file of a static skill as served through `resources/read`.
 *
 * @internal
 */
export interface ServedFile {
  readonly uri: string
  readonly name: string
  readonly description: string | undefined
  readonly mimeType: string
  readonly content: Uint8Array
  readonly digest: string
  // Set when the file is textual and valid UTF-8; otherwise it is served as a blob.
  readonly text: string | undefined
}

/**
 * @internal
 */
export interface StaticSkill {
  readonly entry: McpCore.Skill
  readonly files: ReadonlyArray<ServedFile>
  // Directory URI to its direct children, sorted by name.
  readonly directories: ReadonlyMap<string, ReadonlyArray<McpCore.DirectoryChild>>
}

const MIME_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  ["csv", "text/csv"],
  ["gif", "image/gif"],
  ["html", "text/html"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["js", "text/javascript"],
  ["json", "application/json"],
  ["md", "text/markdown"],
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["py", "text/x-python"],
  ["sh", "text/x-shellscript"],
  ["svg", "image/svg+xml"],
  ["ts", "text/x-typescript"],
  ["txt", "text/plain"],
  ["webp", "image/webp"],
  ["yaml", "application/yaml"],
  ["yml", "application/yaml"]
])

const TEXTUAL_APPLICATION_TYPES: ReadonlySet<string> = new Set([
  "application/json",
  "application/yaml",
  "image/svg+xml"
])

/**
 * @internal
 */
export const mimeTypeFor = (path: string): string => {
  const extension = /\.([^./]+)$/.exec(path)?.[1]?.toLowerCase()
  return (extension === undefined ? undefined : MIME_BY_EXTENSION.get(extension)) ?? "application/octet-stream"
}

// `ignoreBOM` keeps a leading BOM in the decoded text, so re-encoding the text
// reproduces exactly the bytes the manifest digest covers.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

const decodeText = (mimeType: string, content: Uint8Array): string | undefined => {
  if (!mimeType.startsWith("text/") && !TEXTUAL_APPLICATION_TYPES.has(mimeType)) {
    return undefined
  }
  try {
    return utf8.decode(content)
  } catch {
    return undefined
  }
}

const isPlainObject = (u: unknown): u is Record<string, unknown> =>
  typeof u === "object" && u !== null && Object.getPrototypeOf(u) === Object.prototype

const isJsonValue = (u: unknown): boolean => {
  if (u === null || typeof u === "string" || typeof u === "boolean") return true
  if (typeof u === "number") return Number.isFinite(u)
  if (Array.isArray(u)) return u.every(isJsonValue)
  return isPlainObject(u) && Object.values(u).every(isJsonValue)
}

const isSafeRelativePath = (path: string): boolean =>
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
export const parseFrontmatter = (markdown: string): Record<string, unknown> | undefined => {
  const block = FRONTMATTER.exec(markdown)?.[1]
  if (block === undefined) return undefined
  try {
    const parsed = Yaml.parse(block)
    return isPlainObject(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Compares two JSON values by content, ignoring the order of object keys.
 *
 * @internal
 */
export const jsonEquals = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => jsonEquals(item, b[index]))
  }
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null || Array.isArray(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length &&
    keys.every((key) =>
      Object.hasOwn(b, key) && jsonEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
}

const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/

/**
 * Renders a `SKILL.md` whose frontmatter is exactly `frontmatter`. Each value
 * is written as JSON, which YAML 1.2 parses as the same value, so the served
 * frontmatter cannot drift from the entry.
 *
 * @internal
 */
export const renderSkillMd = (frontmatter: Readonly<Record<string, unknown>>, instructions: string): string => {
  let yaml = ""
  for (const [key, value] of Object.entries(frontmatter)) {
    yaml += `${PLAIN_KEY.test(key) ? key : JSON.stringify(key)}: ${JSON.stringify(value)}\n`
  }
  return `---\n${yaml}---\n\n${instructions}`
}

const decodeFrontmatter = Schema.decodeUnknownEffect(PublicMcpSchema.SkillFrontmatter)

const compareNames = (a: { readonly name: string }, b: { readonly name: string }): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0

/**
 * Validates a static skill against the extension's server requirements and
 * precomputes what the protocol serves: the manifest, with digests over the
 * exact bytes served, each file's resource metadata, and the directory tree
 * from the namespace root down.
 *
 * @internal
 */
export const makeStaticSkill = (options: {
  readonly uri: string
  // Read from SKILL.md when omitted; otherwise SKILL.md must carry the same frontmatter.
  readonly frontmatter?: Readonly<Record<string, unknown>> | undefined
  readonly files: ReadonlyArray<SourceFile>
}): Effect.Effect<StaticSkill, Cause.IllegalArgumentError, Digest.Digest> =>
  Effect.gen(function*() {
    const { uri } = options
    const fail = (reason: string) => Effect.fail(new Cause.IllegalArgumentError(`Skill ${uri}: ${reason}`))

    const schemeEnd = uri.indexOf("://")
    if (schemeEnd <= 0 || !uri.endsWith("/SKILL.md")) {
      return yield* fail("the URI must have the form <scheme>://<skill-path>/SKILL.md")
    }
    const scheme = uri.slice(0, schemeEnd + 3)
    const skillPath = uri.slice(scheme.length, -"/SKILL.md".length)
    if (!isSafeRelativePath(skillPath)) {
      return yield* fail("the skill path must have no empty, '.' or '..' segment")
    }
    const name = skillPath.split("/").at(-1)!
    if (options.files.length > MAX_FILES_PER_SKILL) {
      return yield* fail(`it has ${options.files.length} files; the limit is ${MAX_FILES_PER_SKILL}`)
    }
    const totalBytes = options.files.reduce((sum, file) => sum + file.content.byteLength, 0)
    if (totalBytes > MAX_BYTES_PER_SKILL) {
      return yield* fail(`it has ${totalBytes} bytes; the limit is ${MAX_BYTES_PER_SKILL}`)
    }
    const paths = new Set<string>()
    for (const file of options.files) {
      if (!isSafeRelativePath(file.path)) return yield* fail(`the file path "${file.path}" escapes the skill`)
      if (paths.has(file.path)) return yield* fail(`the file "${file.path}" is given twice`)
      paths.add(file.path)
    }
    const skillMd = options.files.find((file) => file.path === "SKILL.md")
    if (skillMd === undefined) return yield* fail("SKILL.md is missing")

    // Hosts compare SKILL.md's frontmatter with the listed one and reject the
    // skill on any difference, so the two must agree before it is served.
    const served = parseFrontmatter(decodeText("text/markdown", skillMd.content) ?? "")
    if (served === undefined) return yield* fail("SKILL.md must begin with YAML frontmatter holding a mapping")
    const frontmatter = options.frontmatter ?? served
    if (!isPlainObject(frontmatter) || !isJsonValue(frontmatter)) {
      return yield* fail("the frontmatter must be a JSON object")
    }
    if (!jsonEquals(frontmatter, served)) {
      return yield* fail("the frontmatter of SKILL.md differs from the given frontmatter")
    }
    if (frontmatter.name !== name) {
      return yield* fail(`the frontmatter name ${JSON.stringify(frontmatter.name)} must equal "${name}"`)
    }
    // A skill served over MCP must conform to the Agent Skills specification.
    const { description } = yield* decodeFrontmatter(frontmatter).pipe(
      Effect.catch((error) => fail(`the frontmatter is not valid Agent Skills frontmatter: ${error.message}`))
    )

    const digest = yield* Digest.Digest
    const sorted = [...options.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    const resources: Array<McpCore.SkillResource> = []
    const files: Array<ServedFile> = []
    const children = new Map<string, Map<string, McpCore.DirectoryChild>>()
    for (const file of sorted) {
      const fileUri = `${scheme}${skillPath}/${file.path}`
      const fileDigest = `sha256:${yield* digest.digestHex(Digest.sha256, file.content)}`
      const mimeType = file.mimeType ?? mimeTypeFor(file.path)
      const isSkillMd = file.path === "SKILL.md"
      files.push({
        uri: fileUri,
        name: isSkillMd ? name : file.path.split("/").at(-1)!,
        description: isSkillMd ? description : undefined,
        mimeType,
        content: file.content,
        digest: fileDigest,
        text: decodeText(mimeType, file.content)
      })
      resources.push({ uri: fileUri, digest: fileDigest, size: file.content.byteLength })

      // Every directory from the namespace root down is readable, including
      // the prefix directories above the skill root.
      const segments = `${skillPath}/${file.path}`.split("/")
      for (let depth = 1; depth < segments.length; depth++) {
        const directory = `${scheme}${segments.slice(0, depth).join("/")}`
        const child: McpCore.DirectoryChild = {
          uri: `${scheme}${segments.slice(0, depth + 1).join("/")}`,
          name: segments[depth]!,
          mimeType: depth === segments.length - 1 ? mimeType : DIRECTORY_MIME_TYPE
        }
        let siblings = children.get(directory)
        if (siblings === undefined) {
          siblings = new Map()
          children.set(directory, siblings)
        }
        siblings.set(child.uri, child)
      }
    }

    const directories = new Map<string, ReadonlyArray<McpCore.DirectoryChild>>()
    for (const [directory, siblings] of children) {
      directories.set(directory, Array.from(siblings.values()).sort(compareNames))
    }
    return { entry: { uri, frontmatter, resources }, files, directories }
  })
