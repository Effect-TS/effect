/**
 * Generates Effect Schema modules from `.proto` descriptors. This is the
 * library behind the `protoc-gen-effect` plugin.
 *
 * PROTOTYPE — see the package README.
 *
 * One TypeScript module is generated per `.proto` file
 * (`acme/v1/points.proto` → `acme/v1/points_effect.ts`):
 *
 * - messages become `Schema.Struct`s annotated with `Protobuf.field`, nested
 *   messages and enums are flattened with `_` (`Shapes.Circle` →
 *   `Shapes_Circle`)
 * - enums become a const object, a type, and a `Schema.Enum` (`ColorSchema`)
 * - oneofs become a union of `Schema.TaggedStruct`s with a single `value`
 * - services become an `RpcGroup` annotated with `ConnectRpc.ServiceName`
 *
 * Editions, groups, extensions and client / bidi streaming methods are not
 * supported.
 *
 * @since 4.0.0
 */
import type {
  CodeGeneratorRequest,
  CodeGeneratorResponse,
  DescriptorProto,
  EnumDescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  SourceCodeInfo_Location
} from "./Descriptor.ts"
import { Feature, FieldLabel, FieldType, JSType } from "./Descriptor.ts"
import { protoCamelCase, protoSnakeCase } from "./internal/annotations.ts"

/**
 * A generated module.
 *
 * @since 4.0.0
 */
export interface GeneratedFile {
  readonly name: string
  readonly content: string
}

/**
 * @since 4.0.0
 */
export interface GenerateOptions {
  /** Names of the `.proto` files to generate modules for. */
  readonly filesToGenerate: ReadonlyArray<string>
  /** Extension of relative imports between generated modules. Defaults to `"js"`. */
  readonly importExtension?: "js" | "ts" | "none" | undefined
  /** Module specifier of `@effect/protobuf`. Defaults to `"@effect/protobuf"`. */
  readonly effectProtobufImport?: string | undefined
}

/**
 * Thrown by {@link generateFiles} for unsupported or invalid input.
 *
 * @since 4.0.0
 */
export class CodegenError extends Error {
  override readonly name = "ProtoCodegenError"
}

/**
 * Runs the generator for a plugin request. Failures are reported in the
 * `error` field of the response.
 *
 * Plugin parameters (comma separated):
 *
 * - `import_extension=js|ts|none` (default `js`)
 * - `effect_import=<module>` (default `@effect/protobuf`)
 *
 * @since 4.0.0
 */
export const generate = (request: CodeGeneratorRequest): CodeGeneratorResponse => {
  const supportedFeatures = BigInt(Feature.FEATURE_PROTO3_OPTIONAL)
  try {
    const files = generateFiles(request.protoFile, {
      filesToGenerate: request.fileToGenerate,
      ...parseParameter(request.parameter ?? "")
    })
    return { supportedFeatures, file: files.map((f) => ({ name: f.name, content: f.content })) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), supportedFeatures, file: [] }
  }
}

const parseParameter = (parameter: string): Omit<GenerateOptions, "filesToGenerate"> => {
  let importExtension: GenerateOptions["importExtension"]
  let effectProtobufImport: string | undefined
  for (const part of parameter.split(",")) {
    const trimmed = part.trim()
    if (trimmed === "") continue
    const eq = trimmed.indexOf("=")
    const key = eq === -1 ? trimmed : trimmed.slice(0, eq)
    const value = eq === -1 ? "" : trimmed.slice(eq + 1)
    switch (key) {
      case "import_extension": {
        const ext = value.startsWith(".") ? value.slice(1) : value
        if (ext !== "js" && ext !== "ts" && ext !== "none") {
          throw new CodegenError(`invalid import_extension "${value}", expected js, ts or none`)
        }
        importExtension = ext
        break
      }
      case "effect_import": {
        if (value === "") throw new CodegenError("effect_import needs a value")
        effectProtobufImport = value
        break
      }
      default:
        throw new CodegenError(`unknown plugin parameter "${key}"`)
    }
  }
  return { importExtension, effectProtobufImport }
}

/**
 * Generates one module per file in `options.filesToGenerate`. `files` must
 * contain those files and all of their dependencies.
 *
 * @since 4.0.0
 */
export const generateFiles = (
  files: ReadonlyArray<FileDescriptorProto>,
  options: GenerateOptions
): Array<GeneratedFile> => {
  const registry = buildRegistry(files)
  const byName = new Map(files.map((f) => [f.name ?? "", f]))
  return options.filesToGenerate.map((name) => {
    const file = byName.get(name)
    if (file === undefined) throw new CodegenError(`file ${name} is missing from the request`)
    return generateFile(file, registry, {
      importExtension: options.importExtension ?? "js",
      effectProtobufImport: options.effectProtobufImport ?? "@effect/protobuf"
    })
  })
}

// -----------------------------------------------------------------------------
// registry
// -----------------------------------------------------------------------------

interface MessageType {
  readonly _: "message"
  /** Fully-qualified name without the leading dot. */
  readonly fullName: string
  readonly tsName: string
  readonly file: FileDescriptorProto
  readonly desc: DescriptorProto
  readonly path: ReadonlyArray<number>
  readonly mapEntry: boolean
}

interface EnumType {
  readonly _: "enum"
  readonly fullName: string
  readonly tsName: string
  readonly file: FileDescriptorProto
  readonly desc: EnumDescriptorProto
  readonly path: ReadonlyArray<number>
}

type NamedType = MessageType | EnumType

/** Keyed by fully-qualified name with the leading dot, as in `type_name`. */
type Registry = ReadonlyMap<string, NamedType>

// field numbers in descriptor.proto, for SourceCodeInfo paths
const FILE_MESSAGE_TYPE = 4
const FILE_ENUM_TYPE = 5
const FILE_SERVICE = 6
const MESSAGE_FIELD = 2
const MESSAGE_NESTED_TYPE = 3
const MESSAGE_ENUM_TYPE = 4
const MESSAGE_ONEOF_DECL = 8
const ENUM_VALUE = 2
const SERVICE_METHOD = 2

const buildRegistry = (files: ReadonlyArray<FileDescriptorProto>): Registry => {
  const registry = new Map<string, NamedType>()
  for (const file of files) {
    const prefix = file.package ? `.${file.package}` : ""
    const addEnum = (desc: EnumDescriptorProto, scope: string, tsScope: string, path: ReadonlyArray<number>) => {
      const name = desc.name ?? ""
      registry.set(`${scope}.${name}`, {
        _: "enum",
        fullName: `${scope}.${name}`.slice(1),
        tsName: safeIdentifier(tsScope === "" ? name : `${tsScope}_${name}`),
        file,
        desc,
        path
      })
    }
    const addMessage = (desc: DescriptorProto, scope: string, tsScope: string, path: ReadonlyArray<number>) => {
      const name = desc.name ?? ""
      const fullName = `${scope}.${name}`
      const tsName = tsScope === "" ? name : `${tsScope}_${name}`
      registry.set(fullName, {
        _: "message",
        fullName: fullName.slice(1),
        tsName: safeIdentifier(tsName),
        file,
        desc,
        path,
        mapEntry: desc.options?.mapEntry === true
      })
      desc.nestedType.forEach((d, i) => addMessage(d, fullName, tsName, [...path, MESSAGE_NESTED_TYPE, i]))
      desc.enumType.forEach((d, i) => addEnum(d, fullName, tsName, [...path, MESSAGE_ENUM_TYPE, i]))
    }
    file.messageType.forEach((d, i) => addMessage(d, prefix, "", [FILE_MESSAGE_TYPE, i]))
    file.enumType.forEach((d, i) => addEnum(d, prefix, "", [FILE_ENUM_TYPE, i]))
  }
  return registry
}

/** Names that generated declarations must not shadow. */
const reserved = new Set([
  // imports and globals used by generated code
  "Schema",
  "Rpc",
  "RpcGroup",
  "ConnectRpc",
  "Protobuf",
  "ReadonlyArray",
  "Uint8Array",
  "Array",
  "Object",
  "Record",
  "String",
  "Number",
  "Boolean",
  "BigInt",
  "Symbol",
  "Error",
  "Promise",
  // reserved words
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "let",
  "static",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "await",
  "arguments",
  "eval",
  "undefined",
  "NaN",
  "Infinity",
  "type",
  "any",
  "unknown",
  "never",
  "object",
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol"
])

const safeIdentifier = (name: string): string => reserved.has(name) ? `${name}$` : name

// -----------------------------------------------------------------------------
// well-known types
// -----------------------------------------------------------------------------

const wellKnownTypes: Record<string, string> = {
  ".google.protobuf.Timestamp": "Timestamp",
  ".google.protobuf.Duration": "Duration",
  ".google.protobuf.Empty": "Empty",
  ".google.protobuf.Value": "Value",
  ".google.protobuf.Struct": "Struct",
  ".google.protobuf.ListValue": "ListValue",
  ".google.protobuf.Any": "Any",
  ".google.protobuf.StringValue": "StringValue",
  ".google.protobuf.BoolValue": "BoolValue",
  ".google.protobuf.BytesValue": "BytesValue",
  ".google.protobuf.DoubleValue": "DoubleValue",
  ".google.protobuf.FloatValue": "FloatValue",
  ".google.protobuf.Int32Value": "Int32Value",
  ".google.protobuf.UInt32Value": "UInt32Value",
  ".google.protobuf.Int64Value": "Int64Value",
  ".google.protobuf.UInt64Value": "UInt64Value"
}

/** Well-known types that are messages on the Effect side too. */
const messageWellKnownTypes = new Set([".google.protobuf.Empty", ".google.protobuf.Any"])

// -----------------------------------------------------------------------------
// file generation
// -----------------------------------------------------------------------------

interface ResolvedOptions {
  readonly importExtension: "js" | "ts" | "none"
  readonly effectProtobufImport: string
}

interface Context {
  readonly file: FileDescriptorProto
  readonly fileName: string
  readonly proto2: boolean
  readonly registry: Registry
  readonly options: ResolvedOptions
  readonly comments: ReadonlyMap<string, SourceCodeInfo_Location>
  /** Messages that are part of a reference cycle, mapped to their cycle id. */
  readonly cycles: ReadonlyMap<string, number>
  readonly imports: Map<string, string>
  readonly uses: Set<"Schema" | "Rpc" | "RpcGroup" | "ConnectRpc" | "Protobuf">
}

const generateFile = (file: FileDescriptorProto, registry: Registry, options: ResolvedOptions): GeneratedFile => {
  const fileName = file.name ?? ""
  const syntax = file.syntax === undefined || file.syntax === "" ? "proto2" : file.syntax
  if (syntax !== "proto2" && syntax !== "proto3") {
    throw new CodegenError(`${fileName}: editions are not supported by the prototype`)
  }
  const local: Array<NamedType> = []
  for (const t of registry.values()) {
    if (t.file === file && !(t._ === "message" && t.mapEntry)) local.push(t)
  }
  checkUniqueNames(fileName, local, file)

  const order = sortDeclarations(local, registry)
  const cycles = new Map<string, number>()
  order.forEach((scc, i) => {
    const t = scc[0]
    if (scc.length > 1 || (t._ === "message" && dependencies(t, registry).includes(t))) {
      for (const m of scc) cycles.set(m.fullName, i)
    }
  })

  const ctx: Context = {
    file,
    fileName,
    proto2: syntax === "proto2",
    registry,
    options,
    comments: new Map((file.sourceCodeInfo?.location ?? []).map((l) => [l.path.join("."), l])),
    cycles,
    imports: new Map(),
    uses: new Set()
  }

  const blocks: Array<string> = []
  for (const scc of order) {
    for (const t of scc) blocks.push(t._ === "enum" ? renderEnum(ctx, t) : renderMessage(ctx, t))
  }
  file.service.forEach((_, i) => blocks.push(renderService(ctx, i)))

  const header = [
    `// @generated by protoc-gen-effect from file ${fileName} (${
      file.package ? `package ${file.package}, ` : ""
    }syntax ${syntax})`,
    "/* eslint-disable */"
  ]
  // sorted by module specifier, like dprint
  const imports: Array<readonly [string, string]> = []
  if (ctx.uses.has("Schema")) imports.push(["effect", "{ Schema }"])
  const rpc = (["Rpc", "RpcGroup"] as const).filter((n) => ctx.uses.has(n))
  if (rpc.length > 0) imports.push(["effect/rpc", `{ ${rpc.join(", ")} }`])
  const own = (["ConnectRpc", "Protobuf"] as const).filter((n) => ctx.uses.has(n))
  if (own.length > 0) imports.push([options.effectProtobufImport, `{ ${own.join(", ")} }`])
  for (const [target, alias] of ctx.imports) {
    imports.push([relativeImport(fileName, target, options.importExtension), `* as ${alias}`])
  }
  const importLines = imports
    .sort(([a], [b]) => compareSpecifiers(a, b))
    .map(([from, what]) => `import ${what} from "${from}"`)
  const content = [[...header, ...importLines].join("\n"), ...blocks].join("\n\n") + "\n"
  return { name: generatedName(fileName), content }
}

/** Package imports first, then relative imports, each alphabetically. */
const compareSpecifiers = (a: string, b: string): number => {
  const relA = a.startsWith(".")
  const relB = b.startsWith(".")
  if (relA !== relB) return relA ? 1 : -1
  return a < b ? -1 : a > b ? 1 : 0
}

const generatedName = (protoFile: string): string => protoFile.replace(/\.proto$/, "") + "_effect.ts"

const relativeImport = (from: string, to: string, ext: ResolvedOptions["importExtension"]): string => {
  const fromDir = from.split("/").slice(0, -1)
  const target = generatedName(to).split("/")
  let common = 0
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) common++
  const up = fromDir.length - common
  const rest = target.slice(common).join("/")
  const path = (up === 0 ? "./" : "../".repeat(up)) + rest
  const base = path.slice(0, -".ts".length)
  return ext === "none" ? base : `${base}.${ext}`
}

const importAlias = (ctx: Context, file: FileDescriptorProto): string => {
  const name = file.name ?? ""
  let alias = ctx.imports.get(name)
  if (alias === undefined) {
    alias = name.replace(/\.proto$/, "").replace(/[^A-Za-z0-9_]/g, "_") + "_effect"
    ctx.imports.set(name, alias)
  }
  return alias
}

const checkUniqueNames = (fileName: string, local: ReadonlyArray<NamedType>, file: FileDescriptorProto) => {
  const seen = new Map<string, string>()
  const add = (name: string, source: string) => {
    const prev = seen.get(name)
    if (prev !== undefined) {
      throw new CodegenError(`${fileName}: ${source} and ${prev} would both be generated as ${name}`)
    }
    seen.set(name, source)
  }
  for (const t of local) {
    add(t.tsName, t.fullName)
    if (t._ === "enum") add(`${t.tsName}Schema`, t.fullName)
  }
  for (const s of file.service) add(safeIdentifier(s.name ?? ""), `service ${s.name}`)
}

// -----------------------------------------------------------------------------
// ordering
// -----------------------------------------------------------------------------

/** Local types referenced by the fields of a message (through map entries). */
const dependencies = (t: NamedType, registry: Registry): Array<NamedType> => {
  if (t._ === "enum") return []
  const out: Array<NamedType> = []
  const visit = (desc: DescriptorProto) => {
    for (const f of desc.field) {
      if (f.typeName === undefined) continue
      const dep = registry.get(f.typeName)
      if (dep === undefined || dep.file !== t.file) continue
      if (dep._ === "message" && dep.mapEntry) visit(dep.desc)
      else out.push(dep)
    }
  }
  visit(t.desc)
  return out
}

/**
 * Strongly connected components in dependency order (Tarjan's algorithm emits
 * a component after everything it references).
 */
const sortDeclarations = (nodes: ReadonlyArray<NamedType>, registry: Registry): Array<Array<NamedType>> => {
  const declared = new Map(nodes.map((n, i) => [n, i]))
  const index = new Map<NamedType, number>()
  const low = new Map<NamedType, number>()
  const stack: Array<NamedType> = []
  const onStack = new Set<NamedType>()
  const out: Array<Array<NamedType>> = []
  let counter = 0
  const strongConnect = (v: NamedType) => {
    index.set(v, counter)
    low.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)
    for (const w of dependencies(v, registry)) {
      if (!index.has(w)) {
        strongConnect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }
    if (low.get(v) === index.get(v)) {
      const scc: Array<NamedType> = []
      let w: NamedType
      do {
        w = stack.pop()!
        onStack.delete(w)
        scc.push(w)
      } while (w !== v)
      out.push(scc.sort((a, b) => declared.get(a)! - declared.get(b)!))
    }
  }
  for (const n of nodes) if (!index.has(n)) strongConnect(n)
  return out
}

// -----------------------------------------------------------------------------
// comments
// -----------------------------------------------------------------------------

const commentText = (ctx: Context, path: ReadonlyArray<number>): string => {
  const location = ctx.comments.get(path.join("."))
  const parts: Array<string> = []
  for (const c of [location?.leadingComments, location?.trailingComments]) {
    if (c === undefined) continue
    const text = c.replace(/\n$/, "").split("\n").map((l) => (l.startsWith(" ") ? l.slice(1) : l)).join("\n")
    if (text.trim() !== "") parts.push(text)
  }
  return parts.join("\n\n")
}

const jsDoc = (sections: ReadonlyArray<string | undefined>, indent: string): Array<string> => {
  const text = sections.filter((s): s is string => s !== undefined && s !== "").join("\n\n")
  if (text === "") return []
  const lines = text.split("\n").map((l) => l.split("*/").join("*\\/"))
  return [`${indent}/**`, ...lines.map((l) => (l === "" ? `${indent} *` : `${indent} * ${l}`)), `${indent} */`]
}

// -----------------------------------------------------------------------------
// types and schemas
// -----------------------------------------------------------------------------

interface Rendered {
  /** Schema expression. */
  readonly schema: string
  /** TypeScript type (for interfaces of recursive messages). */
  readonly type: string
}

const lookup = (ctx: Context, typeName: string, where: string): NamedType => {
  const t = ctx.registry.get(typeName)
  if (t === undefined) throw new CodegenError(`${where}: unknown type ${typeName}`)
  return t
}

const renderMessageRef = (ctx: Context, typeName: string, from: string | undefined, where: string): Rendered => {
  const wkt = wellKnownTypes[typeName]
  if (wkt !== undefined) {
    ctx.uses.add("Protobuf")
    return { schema: `Protobuf.${wkt}`, type: `typeof Protobuf.${wkt}.Type` }
  }
  const t = lookup(ctx, typeName, where)
  if (t._ !== "message") throw new CodegenError(`${where}: ${typeName} is not a message`)
  if (t.fullName.startsWith("google.protobuf.") && t.file !== ctx.file) {
    throw new CodegenError(`${where}: well-known type ${t.fullName} is not supported by the prototype`)
  }
  if (t.file !== ctx.file) {
    const ref = `${importAlias(ctx, t.file)}.${t.tsName}`
    return { schema: ref, type: ref }
  }
  const cycle = from === undefined ? undefined : ctx.cycles.get(from)
  if (cycle !== undefined && ctx.cycles.get(t.fullName) === cycle) {
    ctx.uses.add("Schema")
    return { schema: `Schema.suspend((): Schema.Codec<${t.tsName}> => ${t.tsName})`, type: t.tsName }
  }
  return { schema: t.tsName, type: t.tsName }
}

const renderEnumRef = (ctx: Context, typeName: string, where: string): Rendered => {
  const t = lookup(ctx, typeName, where)
  if (t._ !== "enum") throw new CodegenError(`${where}: ${typeName} is not an enum`)
  if (t.fullName.startsWith("google.protobuf.") && t.file !== ctx.file) {
    throw new CodegenError(`${where}: well-known type ${t.fullName} is not supported by the prototype`)
  }
  if (t.file !== ctx.file) {
    const alias = importAlias(ctx, t.file)
    return { schema: `${alias}.${t.tsName}Schema`, type: `${alias}.${t.tsName}` }
  }
  return { schema: `${t.tsName}Schema`, type: t.tsName }
}

const protobufScalar = (ctx: Context, name: string, type: string): Rendered => {
  ctx.uses.add("Protobuf")
  return { schema: `Protobuf.${name}`, type }
}

const schemaScalar = (ctx: Context, name: string, type: string): Rendered => {
  ctx.uses.add("Schema")
  return { schema: `Schema.${name}`, type }
}

const renderValue = (ctx: Context, field: FieldDescriptorProto, from: string, where: string): Rendered => {
  const jsNumber = field.options?.jstype === JSType.JS_NUMBER
  switch (field.type) {
    case FieldType.TYPE_DOUBLE:
      return schemaScalar(ctx, "Number", "number")
    case FieldType.TYPE_FLOAT:
      return protobufScalar(ctx, "Float", "number")
    case FieldType.TYPE_INT32:
      return protobufScalar(ctx, "Int32", "number")
    case FieldType.TYPE_UINT32:
      return protobufScalar(ctx, "UInt32", "number")
    case FieldType.TYPE_SINT32:
      return protobufScalar(ctx, "SInt32", "number")
    case FieldType.TYPE_FIXED32:
      return protobufScalar(ctx, "Fixed32", "number")
    case FieldType.TYPE_SFIXED32:
      return protobufScalar(ctx, "SFixed32", "number")
    case FieldType.TYPE_INT64:
      return jsNumber ? protobufScalar(ctx, "Int64Number", "number") : protobufScalar(ctx, "Int64", "bigint")
    case FieldType.TYPE_UINT64:
      return jsNumber ? protobufScalar(ctx, "UInt64Number", "number") : protobufScalar(ctx, "UInt64", "bigint")
    case FieldType.TYPE_SINT64:
      return protobufScalar(ctx, "SInt64", "bigint")
    case FieldType.TYPE_FIXED64:
      return protobufScalar(ctx, "Fixed64", "bigint")
    case FieldType.TYPE_SFIXED64:
      return protobufScalar(ctx, "SFixed64", "bigint")
    case FieldType.TYPE_BOOL:
      return schemaScalar(ctx, "Boolean", "boolean")
    case FieldType.TYPE_STRING:
      return schemaScalar(ctx, "String", "string")
    case FieldType.TYPE_BYTES:
      return schemaScalar(ctx, "Uint8Array", "Uint8Array")
    case FieldType.TYPE_ENUM:
      return renderEnumRef(ctx, field.typeName ?? "", where)
    case FieldType.TYPE_MESSAGE:
      return renderMessageRef(ctx, field.typeName ?? "", from, where)
    case FieldType.TYPE_GROUP:
      throw new CodegenError(`${where}: groups are not supported by the prototype`)
    default:
      throw new CodegenError(`${where}: unknown field type ${field.type}`)
  }
}

const renderMapKey = (ctx: Context, field: FieldDescriptorProto, where: string): Rendered => {
  switch (field.type) {
    case FieldType.TYPE_STRING:
      return schemaScalar(ctx, "String", "string")
    case FieldType.TYPE_INT32:
      return protobufScalar(ctx, "Int32", "number")
    case FieldType.TYPE_UINT32:
      return protobufScalar(ctx, "UInt32", "number")
    case FieldType.TYPE_SINT32:
      return protobufScalar(ctx, "SInt32", "number")
    case FieldType.TYPE_FIXED32:
      return protobufScalar(ctx, "Fixed32", "number")
    case FieldType.TYPE_SFIXED32:
      return protobufScalar(ctx, "SFixed32", "number")
    case FieldType.TYPE_INT64:
      return protobufScalar(ctx, `mapKey("int64")`, "string")
    case FieldType.TYPE_UINT64:
      return protobufScalar(ctx, `mapKey("uint64")`, "string")
    case FieldType.TYPE_SINT64:
      return protobufScalar(ctx, `mapKey("sint64")`, "string")
    case FieldType.TYPE_FIXED64:
      return protobufScalar(ctx, `mapKey("fixed64")`, "string")
    case FieldType.TYPE_SFIXED64:
      return protobufScalar(ctx, `mapKey("sfixed64")`, "string")
    case FieldType.TYPE_BOOL:
      return protobufScalar(ctx, `mapKey("bool")`, "string")
    default:
      throw new CodegenError(`${where}: invalid map key type ${field.type}`)
  }
}

const isPackable = (field: FieldDescriptorProto) =>
  field.type !== FieldType.TYPE_STRING && field.type !== FieldType.TYPE_BYTES &&
  field.type !== FieldType.TYPE_MESSAGE && field.type !== FieldType.TYPE_GROUP

const fieldCall = (
  ctx: Context,
  number: number,
  options: { readonly name?: string; readonly jsonName?: string; readonly packed?: boolean | undefined }
): string => {
  ctx.uses.add("Protobuf")
  const entries: Array<string> = []
  if (options.name !== undefined) entries.push(`name: ${JSON.stringify(options.name)}`)
  if (options.jsonName !== undefined) entries.push(`jsonName: ${JSON.stringify(options.jsonName)}`)
  if (options.packed !== undefined) entries.push(`packed: ${options.packed}`)
  return entries.length === 0 ? `Protobuf.field(${number})` : `Protobuf.field(${number}, { ${entries.join(", ")} })`
}

/** `name` / `jsonName` options needed for a property key to map back to the proto field. */
const nameOptions = (key: string, field: FieldDescriptorProto) => {
  const name = field.name ?? ""
  const out: { name?: string; jsonName?: string } = {}
  if (protoSnakeCase(key) !== name) out.name = name
  if (field.jsonName !== undefined && field.jsonName !== protoCamelCase(name)) out.jsonName = field.jsonName
  return out
}

interface Member {
  readonly key: string
  readonly optional: boolean
  readonly schema: string
  readonly type: string
  readonly doc: Array<string>
}

const deprecatedTag = (deprecated: boolean | undefined) => deprecated === true ? "@deprecated" : undefined

const renderField = (
  ctx: Context,
  message: MessageType,
  field: FieldDescriptorProto,
  path: ReadonlyArray<number>
): Member => {
  const name = field.name ?? ""
  const where = `${message.fullName}.${name}`
  const key = protoCamelCase(name)
  const number = field.number ?? 0
  const doc = jsDoc([commentText(ctx, path), deprecatedTag(field.options?.deprecated)], "  ")
  const names = nameOptions(key, field)

  if (field.label === FieldLabel.LABEL_REPEATED) {
    const entry = field.type === FieldType.TYPE_MESSAGE ? ctx.registry.get(field.typeName ?? "") : undefined
    if (entry !== undefined && entry._ === "message" && entry.mapEntry) {
      const keyField = entry.desc.field.find((f) => f.number === 1)
      const valueField = entry.desc.field.find((f) => f.number === 2)
      if (keyField === undefined || valueField === undefined) {
        throw new CodegenError(`${where}: invalid map entry ${entry.fullName}`)
      }
      const k = renderMapKey(ctx, keyField, where)
      const v = renderValue(ctx, valueField, message.fullName, where)
      ctx.uses.add("Schema")
      return {
        key,
        optional: false,
        schema: `Schema.Record(${k.schema}, ${v.schema}).pipe(${fieldCall(ctx, number, names)})`,
        type: `{ readonly [x: ${k.type}]: ${v.type} }`,
        doc
      }
    }
    const v = renderValue(ctx, field, message.fullName, where)
    let packed: boolean | undefined
    if (isPackable(field)) {
      const declared = field.options?.packed
      if (ctx.proto2 ? declared !== true : declared === false) packed = false
    }
    ctx.uses.add("Schema")
    return {
      key,
      optional: false,
      schema: `Schema.Array(${v.schema}).pipe(${fieldCall(ctx, number, { ...names, packed })})`,
      type: `ReadonlyArray<${v.type}>`,
      doc
    }
  }

  const v = renderValue(ctx, field, message.fullName, where)
  const optional = field.type === FieldType.TYPE_MESSAGE || field.proto3Optional === true ||
    (ctx.proto2 && field.label === FieldLabel.LABEL_OPTIONAL)
  if (optional) ctx.uses.add("Schema")
  return {
    key,
    optional,
    schema: `${optional ? `Schema.optionalKey(${v.schema})` : v.schema}.pipe(${fieldCall(ctx, number, names)})`,
    type: v.type,
    doc
  }
}

const renderOneof = (
  ctx: Context,
  message: MessageType,
  index: number,
  fields: ReadonlyArray<readonly [FieldDescriptorProto, number]>
): Member => {
  const decl = message.desc.oneofDecl[index]
  const key = protoCamelCase(decl?.name ?? "")
  ctx.uses.add("Schema")
  const cases = fields.map(([field, i]) => {
    const where = `${message.fullName}.${field.name}`
    const tag = protoCamelCase(field.name ?? "")
    const v = renderValue(ctx, field, message.fullName, where)
    const doc = jsDoc([
      commentText(ctx, [...message.path, MESSAGE_FIELD, i]),
      deprecatedTag(field.options?.deprecated)
    ], "    ")
    return {
      doc,
      schema: `Schema.TaggedStruct(${JSON.stringify(tag)}, { value: ${v.schema}.pipe(${
        fieldCall(ctx, field.number ?? 0, nameOptions(tag, field))
      }) })`,
      type: `{ readonly _tag: ${JSON.stringify(tag)}; readonly value: ${v.type} }`
    }
  })
  const body = cases.flatMap((c, i) => [...c.doc, `    ${c.schema}${i < cases.length - 1 ? "," : ""}`])
  return {
    key,
    optional: true,
    schema: ["Schema.optionalKey(Schema.Union([", ...body, "  ]))"].join("\n"),
    type: cases.map((c) => c.type).join(" | "),
    doc: jsDoc([commentText(ctx, [...message.path, MESSAGE_ONEOF_DECL, index])], "  ")
  }
}

const renderMessage = (ctx: Context, message: MessageType): string => {
  const desc = message.desc
  const members: Array<Member> = []
  const oneofs = new Map<number, Array<readonly [FieldDescriptorProto, number]>>()
  desc.field.forEach((field, i) => {
    if (field.extendee !== undefined) return
    if (field.oneofIndex !== undefined && field.proto3Optional !== true) {
      const group = oneofs.get(field.oneofIndex)
      if (group === undefined) oneofs.set(field.oneofIndex, [[field, i]])
      else group.push([field, i])
    }
  })
  const emitted = new Set<number>()
  desc.field.forEach((field, i) => {
    if (field.extendee !== undefined) return
    if (field.oneofIndex !== undefined && field.proto3Optional !== true) {
      if (emitted.has(field.oneofIndex)) return
      emitted.add(field.oneofIndex)
      members.push(renderOneof(ctx, message, field.oneofIndex, oneofs.get(field.oneofIndex)!))
      return
    }
    members.push(renderField(ctx, message, field, [...message.path, MESSAGE_FIELD, i]))
  })

  ctx.uses.add("Schema")
  const name = message.tsName
  const doc = jsDoc([
    commentText(ctx, message.path),
    `@generated from message ${message.fullName}`,
    deprecatedTag(desc.options?.deprecated)
  ], "")
  const struct = members.length === 0
    ? "Schema.Struct({})"
    : [
      "Schema.Struct({",
      ...members.flatMap((m, i) => [...m.doc, `  ${m.key}: ${m.schema}${i < members.length - 1 ? "," : ""}`]),
      "})"
    ].join("\n")
  const annotate = `.annotate({ identifier: ${JSON.stringify(message.fullName)} })`
  if (ctx.cycles.has(message.fullName)) {
    const iface = members.length === 0
      ? [`export interface ${name} {}`]
      : [
        `export interface ${name} {`,
        ...members.map((m) => `  readonly ${m.key}${m.optional ? "?" : ""}: ${m.type}`),
        "}"
      ]
    return [...doc, ...iface, `export const ${name}: Schema.Codec<${name}> = ${struct}${annotate}`].join("\n")
  }
  return [...doc, `export const ${name} = ${struct}${annotate}`, `export type ${name} = typeof ${name}.Type`].join("\n")
}

const renderEnum = (ctx: Context, t: EnumType): string => {
  ctx.uses.add("Schema")
  const name = t.tsName
  const doc = jsDoc([
    commentText(ctx, t.path),
    `@generated from enum ${t.fullName}`,
    deprecatedTag(t.desc.options?.deprecated)
  ], "")
  const values = t.desc.value.flatMap((v, i) => [
    ...jsDoc([commentText(ctx, [...t.path, ENUM_VALUE, i]), deprecatedTag(v.options?.deprecated)], "  "),
    `  ${v.name}: ${v.number}${i < t.desc.value.length - 1 ? "," : ""}`
  ])
  return [
    ...doc,
    values.length === 0 ? `export const ${name} = {} as const` : [`export const ${name} = {`, ...values, "} as const"]
      .join("\n"),
    `export type ${name} = typeof ${name}[keyof typeof ${name}]`,
    `export const ${name}Schema = Schema.Enum(${name}).annotate({ identifier: ${JSON.stringify(t.fullName)} })`
  ].join("\n")
}

const renderService = (ctx: Context, index: number): string => {
  const service = ctx.file.service[index]
  const fullName = ctx.file.package ? `${ctx.file.package}.${service.name}` : service.name ?? ""
  const path = [FILE_SERVICE, index]
  ctx.uses.add("RpcGroup")
  ctx.uses.add("ConnectRpc")
  const entries: Array<{ readonly lines: Array<string>; readonly rpc: boolean }> = []
  service.method.forEach((method, i) => {
    const where = `${fullName}.${method.name}`
    if (method.clientStreaming === true) {
      const kind = method.serverStreaming === true ? "bidi streaming" : "client streaming"
      entries.push({
        lines: [`  // ${method.name}: ${kind} is not supported by Effect RPC`],
        rpc: false
      })
      return
    }
    ctx.uses.add("Rpc")
    const payload = renderRpcMessage(ctx, method.inputType ?? "", where)
    const success = renderRpcMessage(ctx, method.outputType ?? "", where)
    const stream = method.serverStreaming === true ? ", stream: true" : ""
    entries.push({
      lines: [
        ...jsDoc([commentText(ctx, [...path, SERVICE_METHOD, i]), deprecatedTag(method.options?.deprecated)], "  "),
        `  Rpc.make(${JSON.stringify(method.name)}, { payload: ${payload}, success: ${success}${stream} })`
      ],
      rpc: true
    })
  })
  let lastRpc = -1
  entries.forEach((e, i) => {
    if (e.rpc) lastRpc = i
  })
  const body = entries.flatMap((e, i) => {
    if (!e.rpc || i === lastRpc) return e.lines
    return [...e.lines.slice(0, -1), `${e.lines[e.lines.length - 1]},`]
  })
  const doc = jsDoc([
    commentText(ctx, path),
    `@generated from service ${fullName}`,
    deprecatedTag(service.options?.deprecated)
  ], "")
  return [
    ...doc,
    `export const ${safeIdentifier(service.name ?? "")} = RpcGroup.make(`,
    ...body,
    `).annotate(ConnectRpc.ServiceName, ${JSON.stringify(fullName)})`
  ].join("\n")
}

const renderRpcMessage = (ctx: Context, typeName: string, where: string): string => {
  if (wellKnownTypes[typeName] !== undefined && !messageWellKnownTypes.has(typeName)) {
    throw new CodegenError(
      `${where}: ${typeName.slice(1)} cannot be used as a request or response message by the prototype`
    )
  }
  return renderMessageRef(ctx, typeName, undefined, where).schema
}
