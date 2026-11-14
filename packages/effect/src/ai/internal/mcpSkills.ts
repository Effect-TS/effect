/**
 * The Skills extension (SEP-2640): wire schemas, the catalog behind a static
 * skill, and the handlers shared by the sessionful adapters.
 */
import * as Cause from "../../Cause.ts"
import type * as Digest from "../../crypto/Digest.ts"
import * as Effect from "../../Effect.ts"
import * as Rpc from "../../rpc/Rpc.ts"
import * as RpcGroup from "../../rpc/RpcGroup.ts"
import * as Schema from "../../Schema.ts"
import * as PublicMcpSchema from "../McpSchema.ts"
import * as PublicSkill from "../Skill.ts"
import type * as McpCore from "./mcpCore.ts"
import * as McpProtocol from "./mcpProtocol.ts"
import * as Legacy from "./mcpSchema/v2024_11_05.ts"
import * as Stateless from "./mcpSchema/v2026_07_28.ts"
import * as InternalSkill from "./skill.ts"

/**
 * @internal
 */
export const EXTENSION_ID = "io.modelcontextprotocol/skills"

const DIRECTORY_MIME_TYPE = "inode/directory"

// The extension's per-skill limits, which every conforming host accepts.
const MAX_FILES_PER_SKILL = 512
const MAX_BYTES_PER_SKILL = 16 * 1024 * 1024

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

const Skill = Schema.Struct({
  uri: Schema.String,
  frontmatter: Stateless.UnknownObject,
  resources: Schema.Union([
    Schema.Array(Schema.Struct(PublicMcpSchema.SkillResource.fields)),
    Schema.Literal("dynamic")
  ])
})

// Listed entries are checked one at a time, so that a client can leave out an
// invalid entry instead of rejecting the whole page.
const ListedSkills = Schema.Array(Schema.Unknown)

/**
 * @internal
 */
export class LegacyListSkills extends Rpc.make("skills/list", {
  success: Schema.Struct({ ...Legacy.PaginatedResult.fields, skills: ListedSkills }),
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
  success: Schema.Struct({ ...Legacy.PaginatedResult.fields, resources: Schema.Array(Legacy.Resource) }),
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
  Schema.Struct({ ...Stateless.PaginatedResult, ...Stateless.CacheableResult, skills: ListedSkills }),
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
    resources: Schema.Array(Stateless.Resource)
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
 * Handlers for {@link LegacyRpcs}, for the sessionful adapters.
 *
 * @internal
 */
export const legacyHandlers = (core: McpCore.McpCore) => ({
  "skills/list": Effect.fnUntraced(function*(request: typeof LegacyListSkills.payloadSchema.Type) {
    yield* requireSkills(core, "skills/list")
    const skills = yield* McpProtocol.listForClient(core.skills.list, request?.cursor)
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
    yield* McpProtocol.rejectCursor(request.cursor)
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
 * A file of a static skill as served through `resources/read`.
 *
 * @internal
 */
export interface ServedFile {
  // Listed by `resources/list` and as a child on `resources/directory/read`.
  readonly resource: McpCore.DirectoryChild
  readonly content: Uint8Array
  // Set when the file is textual and valid UTF-8; otherwise it is served as a blob.
  readonly text: string | undefined
}

/**
 * @internal
 */
export interface StaticSkill {
  readonly entry: McpCore.Skill
  readonly files: ReadonlyArray<ServedFile>
  // Directory URI to its direct children.
  readonly directories: ReadonlyMap<string, ReadonlyArray<McpCore.DirectoryChild>>
}

const TEXTUAL_APPLICATION_TYPES: ReadonlySet<string> = new Set([
  "application/json",
  "application/yaml",
  "image/svg+xml"
])

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

const isSafeRelativePath = (path: string): boolean =>
  path !== "" &&
  !path.includes("\\") &&
  path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")

// The Agent Skills `name` rule: lowercase letters, digits and single hyphens,
// neither leading nor trailing, at most 64 characters.
const isSkillName = (name: string): boolean => name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)

/**
 * The JSON-normalized frontmatter of a skill document, preserving permissive
 * remote validation independently of local bundle construction.
 *
 * @internal
 */
export const parseFrontmatter = (markdown: string): Record<string, unknown> | undefined =>
  InternalSkill.parseDocument(markdown)?.frontmatter

// The directory holding a skill's `SKILL.md`, given the `SKILL.md` URI.
const skillRoot = (uri: string): string => uri.slice(0, -"/SKILL.md".length)

/**
 * Whether `uri` addresses a file inside the skill whose `SKILL.md` is at
 * `skillUri`.
 *
 * @internal
 */
export const isSkillFile = (skillUri: string, uri: string): boolean => {
  const root = skillRoot(skillUri)
  return uri.startsWith(`${root}/`) && isSafeRelativePath(uri.slice(root.length + 1))
}

/**
 * Why a skill entry received from a server breaks the extension's rules, or
 * `undefined` when it is valid. Hosts must not load an invalid entry. The
 * digest and size formats are checked by {@link PublicMcpSchema.SkillResource}.
 *
 * @internal
 */
export const entryProblem = (entry: McpCore.Skill): string | undefined => {
  const schemeEnd = entry.uri.indexOf("://")
  if (schemeEnd <= 0 || !entry.uri.endsWith("/SKILL.md")) return "the URI does not address a SKILL.md"
  const root = skillRoot(entry.uri)
  const skillPath = root.slice(schemeEnd + 3)
  if (!isSafeRelativePath(skillPath)) return "the skill path has an empty, '.' or '..' segment"
  const name = skillPath.split("/").at(-1)!
  if (entry.frontmatter.name !== name || !isSkillName(name)) {
    return `the frontmatter name must equal "${name}" and follow the Agent Skills naming rules`
  }
  const description = entry.frontmatter.description
  if (typeof description !== "string" || description === "" || description.length > 1024) {
    return "the frontmatter description must be a string of 1 to 1024 characters"
  }
  if (entry.resources === "dynamic") return undefined
  const uris = new Set<string>()
  for (const resource of entry.resources) {
    if (!isSkillFile(entry.uri, resource.uri)) return `${resource.uri} is not a file of the skill`
    if (uris.has(resource.uri)) return `${resource.uri} is listed twice`
    uris.add(resource.uri)
  }
  return uris.has(entry.uri) ? undefined : "the manifest does not list SKILL.md"
}

/**
 * Whether `child` is a direct child of the directory at `directory`.
 *
 * @internal
 */
export const isDirectChild = (directory: string, child: string): boolean => {
  if (!child.startsWith(`${directory}/`)) return false
  const name = child.slice(directory.length + 1)
  return name !== "" && name !== "." && name !== ".." && !name.includes("/")
}

/**
 * Builds protocol resource and directory records for an immutable local skill.
 * Publication bounds and URI/name checks remain MCP-specific.
 *
 * @internal
 */
export const makeStaticSkill = Effect.fnUntraced(function*(options: {
  readonly uri: string
  readonly skill: PublicSkill.Skill
}): Effect.fn.Return<StaticSkill, Cause.IllegalArgumentError, Digest.Digest> {
  const { uri, skill } = options
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
  if (skill.frontmatter.name !== name) {
    return yield* fail(`the frontmatter name ${JSON.stringify(skill.frontmatter.name)} must equal "${name}"`)
  }
  if (skill.files.length > MAX_FILES_PER_SKILL) {
    return yield* fail(`it has ${skill.files.length} files; the limit is ${MAX_FILES_PER_SKILL}`)
  }
  const totalBytes = skill.files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_BYTES_PER_SKILL) {
    return yield* fail(`it has ${totalBytes} bytes; the limit is ${MAX_BYTES_PER_SKILL}`)
  }
  const manifest = yield* PublicSkill.manifest(skill)
  const resources: Array<McpCore.SkillResource> = []
  const files: Array<ServedFile> = []
  const children = new Map<string, Map<string, McpCore.DirectoryChild>>()
  for (const file of manifest.files) {
    const fileUri = `${scheme}${skillPath}/${file.path}`
    const { mimeType, size } = file
    const content = yield* PublicSkill.readBytes(skill, file.path).pipe(Effect.orDie)
    const resource: McpCore.DirectoryChild = file.path === "SKILL.md"
      ? { uri: fileUri, name, description: skill.frontmatter.description, mimeType, size }
      : { uri: fileUri, name: file.path.split("/").at(-1)!, mimeType, size }
    files.push({ resource, content, text: decodeText(mimeType, content) })
    resources.push({ uri: fileUri, digest: file.digest, size })

    // Ancestor namespace directories stay readable as well as the skill root.
    const segments = `${skillPath}/${file.path}`.split("/")
    for (let depth = 1; depth < segments.length; depth++) {
      const directory = `${scheme}${segments.slice(0, depth).join("/")}`
      const child: McpCore.DirectoryChild = depth === segments.length - 1 ? resource : {
        uri: `${scheme}${segments.slice(0, depth + 1).join("/")}`,
        name: segments[depth]!,
        mimeType: DIRECTORY_MIME_TYPE
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
  for (const [directory, siblings] of children) directories.set(directory, Array.from(siblings.values()))
  return { entry: { uri, frontmatter: skill.frontmatter, resources }, files, directories }
})
