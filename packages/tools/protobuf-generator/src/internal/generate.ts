/**
 * Renders one Effect Schema module per `.proto` file.
 */
import type {
  DescriptorProto,
  EnumDescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  ServiceDescriptorProto,
  SourceCodeInfo_Location
} from "effect/protobuf/ProtobufDescriptor"
import * as String from "effect/String"
import { editionName, type FieldType, fieldType, fileEdition, jsType, label } from "./descriptor.ts"
import {
  editionDefaults,
  type Features,
  fieldFeatures,
  MAXIMUM_EDITION,
  mergeFeatures,
  MINIMUM_EDITION
} from "./features.ts"
import {
  generatedFileName,
  importAlias,
  propertyKey,
  protoCamelCase,
  relativeImport,
  safeIdentifier
} from "./naming.ts"

/** Invalid or unsupported input, reported in the `error` of the plugin response. */
export class GeneratorError extends Error {}

export interface Options {
  readonly importExtension: "js" | "ts" | "none"
  /** How `google.protobuf.Timestamp` is decoded: a `DateTime.Utc`, or its seconds and nanos. */
  readonly timestamp: "datetime" | "parts"
  /** How `google.protobuf.Duration` is decoded: a `Duration`, or its seconds and nanos. */
  readonly duration: "duration" | "parts"
  /**
   * Modules of `.proto` files generated elsewhere, imported instead of
   * generated. A key is a file (`acme/common/v1/common.proto`) or a directory
   * ending in `/` (`acme/common/`), whose specifier also ends in `/` and is
   * followed by the rest of the path (`@acme/common-proto/`).
   */
  readonly protoMap?: Readonly<Record<string, string>> | undefined
}

export interface GeneratedFile {
  readonly name: string
  readonly content: string
}

/**
 * Generates a module for each of `filesToGenerate` that `protoMap` does not
 * map elsewhere. `files` holds them and their dependencies.
 */
export const generateFiles = (
  files: ReadonlyArray<FileDescriptorProto>,
  filesToGenerate: ReadonlyArray<string>,
  options: Options
): Array<GeneratedFile> => {
  const registry = buildRegistry(files)
  const byName = new Map(files.map((file) => [file.name ?? "", file]))
  const out: Array<GeneratedFile> = []
  for (const name of filesToGenerate) {
    if (protoMapModule(options, name) !== undefined) continue
    const file = byName.get(name)
    if (file === undefined) throw new GeneratorError(`${name}: missing from the request`)
    out.push(generateFile(file, registry, options))
  }
  return out
}

// -----------------------------------------------------------------------------
// registry
// -----------------------------------------------------------------------------

interface MessageType {
  readonly _tag: "message"
  /** Fully qualified name without the leading dot. */
  readonly fullName: string
  readonly tsName: string
  readonly file: FileDescriptorProto
  readonly desc: DescriptorProto
  /** The `SourceCodeInfo` path of the declaration. */
  readonly path: ReadonlyArray<number>
  /** Resolved features of the message, which its fields inherit. */
  readonly features: Features
  readonly mapEntry: boolean
}

interface EnumType {
  readonly _tag: "enum"
  readonly fullName: string
  readonly tsName: string
  readonly file: FileDescriptorProto
  readonly desc: EnumDescriptorProto
  readonly path: ReadonlyArray<number>
  readonly open: boolean
}

interface Extension {
  readonly fullName: string
  readonly tsName: string
  readonly desc: FieldDescriptorProto
  readonly path: ReadonlyArray<number>
  /** The features that the extension inherits: those of its scope. */
  readonly features: Features
}

type NamedType = MessageType | EnumType

/** The resolved features of a file and the types it declares, in declaration order. */
interface FileTypes {
  readonly features: Features
  readonly types: Array<NamedType>
}

interface Registry {
  /** Keyed by fully qualified name with the leading dot, as in `type_name`. */
  readonly types: ReadonlyMap<string, NamedType>
  readonly files: ReadonlyMap<FileDescriptorProto, FileTypes>
}

// field numbers in descriptor.proto, for SourceCodeInfo paths
const FILE_MESSAGE_TYPE = 4
const FILE_ENUM_TYPE = 5
const FILE_EXTENSION = 7
const MESSAGE_FIELD = 2
const MESSAGE_NESTED_TYPE = 3
const MESSAGE_ENUM_TYPE = 4
const MESSAGE_EXTENSION = 6
const MESSAGE_ONEOF_DECL = 8
const ENUM_VALUE = 2

const buildRegistry = (files: ReadonlyArray<FileDescriptorProto>): Registry => {
  const types = new Map<string, NamedType>()
  const byFile = new Map<FileDescriptorProto, FileTypes>()
  for (const file of files) {
    const fileFeatures = mergeFeatures(editionDefaults(fileEdition(file)), file.options?.features)
    const declared: Array<NamedType> = []
    const add = (t: NamedType) => {
      types.set(`.${t.fullName}`, t)
      declared.push(t)
    }
    const addEnum = (
      desc: EnumDescriptorProto,
      scope: string,
      tsScope: string,
      path: ReadonlyArray<number>,
      parent: Features
    ) => {
      const name = desc.name ?? ""
      const fullName = `${scope}.${name}`
      add({
        _tag: "enum",
        fullName: fullName.slice(1),
        tsName: safeIdentifier(tsScope === "" ? name : `${tsScope}_${name}`),
        file,
        desc,
        path,
        open: mergeFeatures(parent, desc.options?.features).enumType === "open"
      })
    }
    const addMessage = (
      desc: DescriptorProto,
      scope: string,
      tsScope: string,
      path: ReadonlyArray<number>,
      parent: Features
    ) => {
      const name = desc.name ?? ""
      const fullName = `${scope}.${name}`
      const tsName = tsScope === "" ? name : `${tsScope}_${name}`
      const features = mergeFeatures(parent, desc.options?.features)
      add({
        _tag: "message",
        fullName: fullName.slice(1),
        tsName: safeIdentifier(tsName),
        file,
        desc,
        path,
        features,
        mapEntry: desc.options?.mapEntry === true
      })
      desc.nestedType.forEach((d, i) => addMessage(d, fullName, tsName, [...path, MESSAGE_NESTED_TYPE, i], features))
      desc.enumType.forEach((d, i) => addEnum(d, fullName, tsName, [...path, MESSAGE_ENUM_TYPE, i], features))
    }
    const scope = file.package ? `.${file.package}` : ""
    file.messageType.forEach((d, i) => addMessage(d, scope, "", [FILE_MESSAGE_TYPE, i], fileFeatures))
    file.enumType.forEach((d, i) => addEnum(d, scope, "", [FILE_ENUM_TYPE, i], fileFeatures))
    byFile.set(file, { features: fileFeatures, types: declared })
  }
  return { types, files: byFile }
}

/** The extensions declared in a file, at its top level and in its messages. */
const fileExtensions = (file: FileDescriptorProto, { features, types }: FileTypes): Array<Extension> => {
  const out: Array<Extension> = []
  const scope = file.package ? `${file.package}.` : ""
  file.extension.forEach((desc, i) => {
    const name = desc.name ?? ""
    out.push({
      fullName: `${scope}${name}`,
      tsName: safeIdentifier(protoCamelCase(name)),
      desc,
      path: [FILE_EXTENSION, i],
      features
    })
  })
  for (const t of types) {
    if (t._tag !== "message") continue
    t.desc.extension.forEach((desc, i) => {
      const name = desc.name ?? ""
      out.push({
        fullName: `${t.fullName}.${name}`,
        tsName: safeIdentifier(`${t.tsName}_${protoCamelCase(name)}`),
        desc,
        path: [...t.path, MESSAGE_EXTENSION, i],
        features: t.features
      })
    })
  }
  return out
}

// -----------------------------------------------------------------------------
// types defined by effect
// -----------------------------------------------------------------------------

/**
 * The messages of the well-known types by file. They get no generated module:
 * `effect/protobuf/Protobuf` has a schema of the same name for each.
 */
const wellKnownFiles: Record<string, ReadonlyArray<string>> = {
  "google/protobuf/any.proto": [".google.protobuf.Any"],
  "google/protobuf/duration.proto": [".google.protobuf.Duration"],
  "google/protobuf/empty.proto": [".google.protobuf.Empty"],
  "google/protobuf/field_mask.proto": [".google.protobuf.FieldMask"],
  "google/protobuf/struct.proto": [".google.protobuf.Struct", ".google.protobuf.Value", ".google.protobuf.ListValue"],
  "google/protobuf/timestamp.proto": [".google.protobuf.Timestamp"],
  "google/protobuf/wrappers.proto": [
    ".google.protobuf.DoubleValue",
    ".google.protobuf.FloatValue",
    ".google.protobuf.Int64Value",
    ".google.protobuf.UInt64Value",
    ".google.protobuf.Int32Value",
    ".google.protobuf.UInt32Value",
    ".google.protobuf.BoolValue",
    ".google.protobuf.StringValue",
    ".google.protobuf.BytesValue"
  ]
}

const wellKnownMessages = new Set(Object.values(wellKnownFiles).flat())
const wellKnownEnums = new Set([".google.protobuf.NullValue"])

/** The schema of a well-known type in `effect/protobuf/Protobuf`, which has its unqualified name. */
const wellKnownName = (typeName: string): string => typeName.slice(typeName.lastIndexOf(".") + 1)

/** `.proto` files whose schemas are modules of `effect`, unless `protoMap` maps them elsewhere. */
const effectModules: Record<string, { readonly alias: string; readonly specifier: string }> = {
  "google/protobuf/descriptor.proto": {
    alias: "ProtobufDescriptor",
    specifier: "effect/protobuf/ProtobufDescriptor"
  },
  "google/protobuf/compiler/plugin.proto": {
    alias: "ProtobufPlugin",
    specifier: "effect/protobuf/ProtobufPlugin"
  }
}

/** The module that `protoMap` maps a `.proto` file to: the first entry that matches. */
const protoMapModule = (options: Options, name: string): string | undefined => {
  for (const [key, specifier] of Object.entries(options.protoMap ?? {})) {
    if (key === name) return specifier
    if (key.endsWith("/") && name.startsWith(key)) return specifier + name.slice(key.length)
  }
  return undefined
}

/** The module that the types of an imported `.proto` file come from, from `protoMap` or `effect`. */
const mappedModule = (
  options: Options,
  name: string
): { readonly alias: string; readonly specifier: string } | undefined => {
  const specifier = protoMapModule(options, name)
  return specifier === undefined ? effectModules[name] : { alias: importAlias(name), specifier }
}

// -----------------------------------------------------------------------------
// files
// -----------------------------------------------------------------------------

interface Context {
  readonly file: FileDescriptorProto
  readonly fileName: string
  readonly edition: number
  readonly registry: Registry
  readonly options: Options
  readonly comments: ReadonlyMap<string, SourceCodeInfo_Location>
  /** Whether every declaration of the file is deprecated. */
  readonly deprecated: boolean
  /** Messages that are part of a reference cycle, mapped to their cycle. */
  readonly cycles: ReadonlyMap<string, number>
  /** Imported modules: specifier → namespace alias. */
  readonly imports: Map<string, string>
}

const generateFile = (file: FileDescriptorProto, registry: Registry, options: Options): GeneratedFile => {
  const fileName = file.name ?? ""
  const edition = fileEdition(file)
  if (edition < MINIMUM_EDITION || edition > MAXIMUM_EDITION) {
    throw new GeneratorError(`${fileName}: edition ${editionName(edition)} is not supported`)
  }
  const fileTypes = registry.files.get(file)!
  // Map entries are rendered as `Protobuf.Map`s of their fields.
  const local = fileTypes.types.filter((t) => !(t._tag === "message" && t.mapEntry))
  const order = sortDeclarations(local, registry)
  const cycles = new Map<string, number>()
  order.forEach((component, i) => {
    const t = component[0]
    if (component.length > 1 || dependencies(t, registry).includes(t)) {
      for (const m of component) cycles.set(m.fullName, i)
    }
  })
  const ctx: Context = {
    file,
    fileName,
    edition,
    registry,
    options,
    comments: new Map((file.sourceCodeInfo?.location ?? []).map((l) => [l.path.join("."), l])),
    deprecated: file.options?.deprecated === true,
    cycles,
    imports: new Map()
  }

  const names: Array<readonly [string, string]> = []
  const blocks: Array<string> = []
  for (const t of order.flat()) {
    names.push([t.tsName, `${t._tag} ${t.fullName}`])
    blocks.push(t._tag === "enum" ? renderEnum(ctx, t) : renderMessage(ctx, t))
  }
  const extensions = fileExtensions(file, fileTypes)
  for (const extension of extensions) {
    names.push([extension.tsName, `extension ${extension.fullName}`])
    blocks.push(renderExtension(ctx, extension))
  }
  names.push(["registry", "the registry of the file"])
  blocks.push(renderRegistry(ctx, local, extensions))
  for (const service of file.service) blocks.push(renderService(ctx, service))
  checkNames(ctx, names)

  const source = editionName(edition)
  const header = [
    `// @generated by protoc-gen-effect from ${fileName} (${file.package ? `package ${file.package}, ` : ""}${
      source.startsWith("proto") ? `syntax ${source}` : `edition ${source}`
    })`,
    "/* eslint-disable */"
  ].join("\n")
  const imports = [...ctx.imports]
    .sort(([a], [b]) => compareSpecifiers(a, b))
    .map(([specifier, alias]) => `import * as ${alias} from "${specifier}"`)
  const content = [header, ...(imports.length > 0 ? [imports.join("\n")] : []), ...blocks].join("\n\n") + "\n"
  return { name: generatedFileName(fileName), content }
}

/** Package imports first, then relative imports, each ignoring case like dprint. */
const compareSpecifiers = (a: string, b: string): number => {
  const relativeA = a.startsWith(".")
  const relativeB = b.startsWith(".")
  if (relativeA !== relativeB) return relativeA ? 1 : -1
  const lowerA = a.toLowerCase()
  const lowerB = b.toLowerCase()
  return lowerA < lowerB ? -1 : lowerA > lowerB ? 1 : a < b ? -1 : a > b ? 1 : 0
}

/** The namespace of an imported module, which keeps its first alias when several files map to it. */
const useModule = (ctx: Context, specifier: string, alias: string): string => {
  const existing = ctx.imports.get(specifier)
  if (existing !== undefined) return existing
  ctx.imports.set(specifier, alias)
  return alias
}

const useSchema = (ctx: Context) => useModule(ctx, "effect/Schema", "Schema")
const useProtobuf = (ctx: Context) => useModule(ctx, "effect/protobuf/Protobuf", "Protobuf")

/** The namespace of the module generated for a file, or `undefined` for one without a module. */
const moduleOfFile = (ctx: Context, name: string): string | undefined => {
  if (Object.hasOwn(wellKnownFiles, name)) return undefined
  const mapped = mappedModule(ctx.options, name)
  if (mapped !== undefined) return useModule(ctx, mapped.specifier, mapped.alias)
  return useModule(ctx, relativeImport(ctx.fileName, name, ctx.options.importExtension), importAlias(name))
}

/** The namespace of the module that declares `t`, or `undefined` for the current file. */
const moduleOf = (ctx: Context, t: NamedType): string | undefined =>
  t.file === ctx.file ? undefined : moduleOfFile(ctx, t.file.name ?? "")

/**
 * Generated names must be unique, since nested names are flattened and
 * property keys are camel-cased. `names` pairs each name with what it is
 * generated from.
 */
const checkUnique = (where: string, names: Iterable<readonly [string, string]>, what: string) => {
  const seen = new Map<string, string>()
  for (const [name, source] of names) {
    const previous = seen.get(name)
    if (previous !== undefined) {
      throw new GeneratorError(`${where}: ${previous} and ${source} would both be generated as ${what} ${name}`)
    }
    seen.set(name, source)
  }
}

const checkNames = (ctx: Context, declared: ReadonlyArray<readonly [string, string]>) =>
  checkUnique(ctx.fileName, [
    ...Array.from(ctx.imports.values(), (alias) => [alias, `the import of ${alias}`] as const),
    ...declared
  ], "declaration")

// -----------------------------------------------------------------------------
// ordering
// -----------------------------------------------------------------------------

/** The types of the same file that the fields of a message refer to, including through map entries. */
const dependencies = (t: NamedType, registry: Registry): Array<NamedType> => {
  if (t._tag === "enum") return []
  const out: Array<NamedType> = []
  const visit = (desc: DescriptorProto) => {
    for (const field of desc.field) {
      if (field.typeName === undefined) continue
      const dependency = registry.types.get(field.typeName)
      if (dependency === undefined || dependency.file !== t.file) continue
      if (dependency._tag === "message" && dependency.mapEntry) visit(dependency.desc)
      else out.push(dependency)
    }
  }
  visit(t.desc)
  return out
}

/**
 * Strongly connected components in dependency order: Tarjan's algorithm emits
 * a component after everything it refers to. Members of a component keep their
 * declaration order.
 */
const sortDeclarations = (nodes: ReadonlyArray<NamedType>, registry: Registry): Array<Array<NamedType>> => {
  const declared = new Map(nodes.map((n, i) => [n, i]))
  const index = new Map<NamedType, number>()
  const low = new Map<NamedType, number>()
  const stack: Array<NamedType> = []
  const onStack = new Set<NamedType>()
  const out: Array<Array<NamedType>> = []
  let counter = 0
  const connect = (v: NamedType) => {
    index.set(v, counter)
    low.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)
    for (const w of dependencies(v, registry)) {
      if (!index.has(w)) {
        connect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: Array<NamedType> = []
      let w: NamedType
      do {
        w = stack.pop()!
        onStack.delete(w)
        component.push(w)
      } while (w !== v)
      out.push(component.sort((a, b) => declared.get(a)! - declared.get(b)!))
    }
  }
  for (const n of nodes) if (!index.has(n)) connect(n)
  return out
}

// -----------------------------------------------------------------------------
// comments
// -----------------------------------------------------------------------------

const comment = (ctx: Context, path: ReadonlyArray<number>): string | undefined => {
  const location = ctx.comments.get(path.join("."))
  const parts: Array<string> = []
  for (const text of [location?.leadingComments, location?.trailingComments]) {
    if (text === undefined) continue
    const lines = text.replace(/\n$/, "").split("\n").map((l) => l.startsWith(" ") ? l.slice(1) : l)
    const trimmed = lines.join("\n").replace(/^\n+|\s+$/g, "")
    if (trimmed !== "") parts.push(trimmed)
  }
  return parts.length === 0 ? undefined : parts.join("\n\n")
}

/** A JSDoc block of a description and tags. */
const jsDoc = (
  description: string | undefined,
  tags: ReadonlyArray<string | undefined>,
  indent: string
): Array<string> => {
  const tagLines = tags.filter((tag): tag is string => tag !== undefined).join("\n")
  const text = [description, tagLines].filter((s) => s !== undefined && s !== "").join("\n\n")
  if (text === "") return []
  const lines = text.split("\n").map((l) => l.replaceAll("*/", "*\\/").trimEnd())
  return [`${indent}/**`, ...lines.map((l) => l === "" ? `${indent} *` : `${indent} * ${l}`), `${indent} */`]
}

/**
 * The JSDoc of an export: its description, or `fallback` when it has none,
 * with the paragraphs after the first under `**Details**`.
 */
const exportDoc = (
  description: string | undefined,
  fallback: string,
  tags: ReadonlyArray<string | undefined>
): Array<string> => {
  const paragraphs = (description ?? fallback).split(/\n\n+/)
  const text = paragraphs.length === 1
    ? paragraphs[0]
    : `${paragraphs[0]}\n\n**Details**\n\n${paragraphs.slice(1).join("\n\n")}`
  return jsDoc(text, tags, "")
}

const deprecatedTag = (ctx: Context, deprecated: boolean | undefined) =>
  deprecated === true || ctx.deprecated ? "@deprecated" : undefined

// -----------------------------------------------------------------------------
// values
// -----------------------------------------------------------------------------

const lookup = (ctx: Context, typeName: string, where: string): NamedType => {
  const t = ctx.registry.types.get(typeName)
  if (t === undefined) throw new GeneratorError(`${where}: unknown type ${typeName}`)
  return t
}

const lookupMessage = (ctx: Context, typeName: string, where: string): MessageType => {
  const t = lookup(ctx, typeName, where)
  if (t._tag !== "message") throw new GeneratorError(`${where}: ${typeName.slice(1)} is not a message`)
  return t
}

const renderMessageRef = (ctx: Context, typeName: string, from: MessageType | undefined, where: string): string => {
  if (wellKnownMessages.has(typeName)) {
    const wkt = wellKnownName(typeName)
    const parts = (wkt === "Timestamp" && ctx.options.timestamp === "parts") ||
      (wkt === "Duration" && ctx.options.duration === "parts")
    return `${useProtobuf(ctx)}.${parts ? `${wkt}Parts` : wkt}`
  }
  const t = lookupMessage(ctx, typeName, where)
  const module = moduleOf(ctx, t)
  if (module !== undefined) return `${module}.${t.tsName}`
  const cycle = from === undefined ? undefined : ctx.cycles.get(from.fullName)
  if (cycle !== undefined && ctx.cycles.get(t.fullName) === cycle) {
    // The annotation of the thunk keeps the type of the schema from referring to itself.
    const schema = useSchema(ctx)
    return `${schema}.suspend((): ${schema}.Codec<${t.tsName}> => ${t.tsName})`
  }
  return t.tsName
}

const renderEnumRef = (ctx: Context, typeName: string, where: string): string => {
  if (wellKnownEnums.has(typeName)) return `${useProtobuf(ctx)}.${wellKnownName(typeName)}`
  const t = lookupEnum(ctx, typeName, where)
  const module = moduleOf(ctx, t)
  return module === undefined ? t.tsName : `${module}.${t.tsName}`
}

const lookupEnum = (ctx: Context, typeName: string, where: string): EnumType => {
  const t = lookup(ctx, typeName, where)
  if (t._tag !== "enum") throw new GeneratorError(`${where}: ${typeName.slice(1)} is not an enum`)
  return t
}

const protobufScalar = (ctx: Context, name: string): string => `${useProtobuf(ctx)}.${name}`

const schemaScalar = (ctx: Context, name: string): string => `${useSchema(ctx)}.${name}`

/** The schemas of `effect/protobuf/Protobuf` for the numeric scalars. */
const numericScalars = {
  double: "Double",
  float: "Float",
  int32: "Int32",
  uint32: "UInt32",
  sint32: "SInt32",
  fixed32: "Fixed32",
  sfixed32: "SFixed32",
  int64: "Int64",
  uint64: "UInt64",
  sint64: "SInt64",
  fixed64: "Fixed64",
  sfixed64: "SFixed64"
} as const

type NumericType = keyof typeof numericScalars

const isNumeric = (type: FieldType | undefined): type is NumericType =>
  type !== undefined && Object.hasOwn(numericScalars, type)

/** 64-bit integers are `bigint`s, or `number`s or `string`s as `[jstype]` asks. */
const int64Suffix = { normal: "", number: "Number", string: "String" } as const

// `from` is the message of the field, which refers to messages of its own
// reference cycle through `Schema.suspend`.
const renderValue = (
  ctx: Context,
  field: FieldDescriptorProto,
  from: MessageType | undefined,
  where: string
): string => {
  const type = fieldType(field)
  switch (type) {
    case "bool":
      return schemaScalar(ctx, "Boolean")
    case "string":
      return schemaScalar(ctx, "String")
    case "bytes":
      return schemaScalar(ctx, "Uint8Array")
    case "enum":
      return renderEnumRef(ctx, field.typeName ?? "", where)
    case "message":
    case "group":
      return renderMessageRef(ctx, field.typeName ?? "", from, where)
    default:
      if (!isNumeric(type)) throw new GeneratorError(`${where}: unknown field type ${field.type}`)
      return protobufScalar(ctx, numericScalars[type] + (type.endsWith("64") ? int64Suffix[jsType(field)] : ""))
  }
}

/** The key schema of a map, as `Protobuf.Map` takes it: 64-bit integer keys are `string`s. */
const renderMapKey = (ctx: Context, field: FieldDescriptorProto, where: string): string => {
  const type = fieldType(field)
  if (type === "bool") return protobufScalar(ctx, "BoolKey")
  if (type === "string") return schemaScalar(ctx, "String")
  if (isNumeric(type) && type !== "double" && type !== "float") {
    return protobufScalar(ctx, numericScalars[type] + (type.endsWith("64") ? "String" : ""))
  }
  throw new GeneratorError(`${where}: invalid map key type ${field.type}`)
}

const isMessage = (field: FieldDescriptorProto) => {
  const type = fieldType(field)
  return type === "message" || type === "group"
}

const isPackable = (field: FieldDescriptorProto) => {
  const type = fieldType(field)
  return !isMessage(field) && type !== "string" && type !== "bytes"
}

/** The map entry message of a repeated field, if it is a map. */
const mapEntry = (ctx: Context, field: FieldDescriptorProto): MessageType | undefined => {
  if (label(field) !== "repeated" || !isMessage(field)) return undefined
  const entry = ctx.registry.types.get(field.typeName ?? "")
  return entry !== undefined && entry._tag === "message" && entry.mapEntry ? entry : undefined
}

// -----------------------------------------------------------------------------
// fields
// -----------------------------------------------------------------------------

interface FieldCallOptions {
  readonly name?: string | undefined
  readonly jsonName?: string | undefined
  readonly packed?: false | undefined
  readonly required?: true | undefined
  readonly delimited?: true | undefined
  readonly validateUtf8?: false | undefined
  // The `[default = …]`, as an expression of the decoded type.
  readonly default?: string | undefined
}

const renderOptions = (options: FieldCallOptions): string | undefined => {
  const entries: Array<string> = []
  if (options.name !== undefined) entries.push(`name: ${JSON.stringify(options.name)}`)
  if (options.jsonName !== undefined) entries.push(`jsonName: ${JSON.stringify(options.jsonName)}`)
  if (options.packed !== undefined) entries.push(`packed: ${options.packed}`)
  if (options.required !== undefined) entries.push("required: true")
  if (options.delimited !== undefined) entries.push("delimited: true")
  if (options.validateUtf8 !== undefined) entries.push(`validateUtf8: ${options.validateUtf8}`)
  if (options.default !== undefined) entries.push(`default: ${options.default}`)
  return entries.length === 0 ? undefined : `{ ${entries.join(", ")} }`
}

const fieldCall = (ctx: Context, number: number, options: FieldCallOptions): string => {
  const rendered = renderOptions(options)
  return `${useProtobuf(ctx)}.field(${number}${rendered === undefined ? "" : `, ${rendered}`})`
}

/**
 * The names of a field that `Protobuf.field` cannot derive from its property
 * key, which is the default `json_name` of the field.
 */
const nameOptions = (field: FieldDescriptorProto, key: string): FieldCallOptions => ({
  name: field.name === undefined || field.name === String.camelToSnake(key) ? undefined : field.name,
  jsonName: field.jsonName === undefined || field.jsonName === key ? undefined : field.jsonName
})

/** The options of a field that its resolved features call for. */
const featureOptions = (ctx: Context, field: FieldDescriptorProto, features: Features): FieldCallOptions => {
  const entry = mapEntry(ctx, field)
  const strings = entry === undefined
    ? fieldType(field) === "string"
    : entry.desc.field.some((f) => fieldType(f) === "string")
  return {
    packed: label(field) === "repeated" && isPackable(field) && features.repeatedFieldEncoding === "expanded"
      ? false
      : undefined,
    delimited: isMessage(field) && entry === undefined && features.messageEncoding === "delimited"
      ? true
      : undefined,
    validateUtf8: strings && features.utf8Validation === "none" ? false : undefined
  }
}

/** A property of a generated struct. */
interface Member {
  readonly key: string
  /** What the property is generated from, for errors. */
  readonly source: string
  readonly schema: string
  readonly doc: Array<string>
}

/** The schema of a field, without its presence and `Protobuf.field`: a map, an array, or a value. */
const renderFieldValue = (
  ctx: Context,
  message: MessageType | undefined,
  field: FieldDescriptorProto,
  where: string
): string => {
  const entry = mapEntry(ctx, field)
  if (entry !== undefined) {
    const keyField = entry.desc.field.find((f) => f.number === 1)
    const valueField = entry.desc.field.find((f) => f.number === 2)
    if (keyField === undefined || valueField === undefined) {
      throw new GeneratorError(`${where}: invalid map entry ${entry.fullName}`)
    }
    const k = renderMapKey(ctx, keyField, where)
    const v = renderValue(ctx, valueField, message, where)
    return `${useProtobuf(ctx)}.Map(${k}, ${v})`
  }
  const v = renderValue(ctx, field, message, where)
  return label(field) === "repeated" ? `${useSchema(ctx)}.Array(${v})` : v
}

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
  const features = fieldFeatures(ctx.edition, message.features, field)
  const defaultTo = defaultValue(ctx, field, where)
  const doc = jsDoc(comment(ctx, path), [
    defaultTo === undefined ? undefined : `@default ${defaultTo}`,
    deprecatedTag(ctx, field.options?.deprecated)
  ], "  ")
  const v = renderFieldValue(ctx, message, field, where)
  const repeated = label(field) === "repeated"
  const required = !repeated && features.fieldPresence === "legacyRequired"
  const optional = !repeated && !required && (isMessage(field) || features.fieldPresence === "explicit")
  const options = fieldCall(ctx, number, {
    ...nameOptions(field, key),
    ...featureOptions(ctx, field, features),
    required: required && !isMessage(field) ? true : undefined,
    default: defaultTo
  })
  return {
    key,
    source: `field ${name}`,
    schema: `${optional ? `${useSchema(ctx)}.optionalKey(${v})` : v}.pipe(${options})`,
    doc
  }
}

/** The member of the oneof at `index` of `message`, whose cases are its fields. */
const renderOneof = (ctx: Context, message: MessageType, index: number): Member => {
  const decl = message.desc.oneofDecl[index]
  const key = protoCamelCase(decl?.name ?? "")
  const fields = message.desc.field.flatMap((field, i) =>
    isRealOneof(field) && field.oneofIndex === index ? [[field, i, protoCamelCase(field.name ?? "")] as const] : []
  )
  checkUnique(
    message.fullName,
    fields.map(([field, _, tag]) => [tag, `field ${field.name}`] as const),
    `a case of oneof ${decl?.name}`
  )
  const features = mergeFeatures(message.features, decl?.options?.features)
  const cases = fields.map(([field, i, tag]) => {
    const where = `${message.fullName}.${field.name}`
    const v = renderValue(ctx, field, message, where)
    const options = {
      ...nameOptions(field, tag),
      ...featureOptions(ctx, field, fieldFeatures(ctx.edition, features, field))
    }
    const doc = jsDoc(
      comment(ctx, [...message.path, MESSAGE_FIELD, i]),
      [deprecatedTag(ctx, field.options?.deprecated)],
      "    "
    )
    return { doc, schema: `${propertyKey(tag)}: ${v}.pipe(${fieldCall(ctx, field.number ?? 0, options)})` }
  })
  return {
    key,
    source: `oneof ${decl?.name}`,
    schema: [
      `${useProtobuf(ctx)}.Oneof({`,
      ...cases.flatMap((c, i) => [...c.doc, `    ${c.schema}${i < cases.length - 1 ? "," : ""}`]),
      "  })"
    ].join("\n"),
    doc: jsDoc(comment(ctx, [...message.path, MESSAGE_ONEOF_DECL, index]), [], "  ")
  }
}

// -----------------------------------------------------------------------------
// defaults
// -----------------------------------------------------------------------------

/** The `[default = …]` of a proto2 field, as an expression of its decoded type. */
const defaultValue = (ctx: Context, field: FieldDescriptorProto, where: string): string | undefined => {
  const value = field.defaultValue
  if (value === undefined) return undefined
  switch (fieldType(field)) {
    case "string":
      return JSON.stringify(value)
    case "bytes":
      return `new Uint8Array([${unescapeBytes(value, where).join(", ")}])`
    case "enum": {
      // The literals of an enum are its value names.
      lookup(ctx, field.typeName ?? "", where)
      return JSON.stringify(value)
    }
    case "double":
    case "float":
      return value === "inf" ? "Infinity" : value === "-inf" ? "-Infinity" : value === "nan" ? "NaN" : value
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      switch (jsType(field)) {
        case "number":
          return value
        case "string":
          return JSON.stringify(value)
        default:
          return `${value}n`
      }
    default:
      return value
  }
}

/** The single-character C escapes: `\n` is 10. */
const simpleEscapes: Record<string, number> = {
  n: 10,
  r: 13,
  t: 9,
  a: 7,
  b: 8,
  f: 12,
  v: 11,
  "\\": 92,
  "'": 39,
  "\"": 34,
  "?": 63
}

/** protoc C-escapes the defaults of bytes fields. */
const unescapeBytes = (escaped: string, where: string): Array<number> => {
  const out: Array<number> = []
  for (let i = 0; i < escaped.length; i++) {
    const c = escaped[i]
    if (c !== "\\") {
      out.push(c.charCodeAt(0))
      continue
    }
    const next = escaped[++i]
    if (next !== undefined && Object.hasOwn(simpleEscapes, next)) {
      out.push(simpleEscapes[next])
    } else if (next !== undefined && /[0-7]/.test(next)) {
      let digits = next
      while (digits.length < 3 && /[0-7]/.test(escaped[i + 1] ?? "")) digits += escaped[++i]
      out.push(parseInt(digits, 8) & 0xFF)
    } else if (next === "x") {
      let digits = ""
      while (digits.length < 2 && /[0-9A-Fa-f]/.test(escaped[i + 1] ?? "")) digits += escaped[++i]
      out.push(parseInt(digits, 16))
    } else {
      throw new GeneratorError(`${where}: invalid escape in the default of a bytes field`)
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// declarations
// -----------------------------------------------------------------------------

const isRealOneof = (field: FieldDescriptorProto) => field.oneofIndex !== undefined && field.proto3Optional !== true

const renderMessage = (ctx: Context, message: MessageType): string => {
  const desc = message.desc
  if (desc.options?.messageSetWireFormat === true && desc.field.length > 0) {
    throw new GeneratorError(`${message.fullName}: a MessageSet has no fields of its own`)
  }
  // A oneof is a member where its first field is.
  const members: Array<Member> = []
  const oneofs = new Set<number>()
  desc.field.forEach((field, i) => {
    if (!isRealOneof(field)) {
      members.push(renderField(ctx, message, field, [...message.path, MESSAGE_FIELD, i]))
    } else if (!oneofs.has(field.oneofIndex!)) {
      oneofs.add(field.oneofIndex!)
      members.push(renderOneof(ctx, message, field.oneofIndex!))
    }
  })
  checkUnique(message.fullName, members.map((m) => [m.key, m.source] as const), "property")
  const schema = useSchema(ctx)
  const name = message.tsName
  const doc = exportDoc(comment(ctx, message.path), `Schema for the \`${message.fullName}\` message.`, [
    deprecatedTag(ctx, desc.options?.deprecated)
  ])
  const fields = members.length === 0
    ? "{}"
    : [
      "{",
      ...members.flatMap((m, i) => [
        ...m.doc,
        `  ${propertyKey(m.key)}: ${m.schema}${i < members.length - 1 ? "," : ""}`
      ]),
      "}"
    ].join("\n")
  const call = desc.options?.messageSetWireFormat === true
    ? `${useProtobuf(ctx)}.MessageSet(${JSON.stringify(message.fullName)})`
    : `${useProtobuf(ctx)}.Message(${JSON.stringify(message.fullName)}, ${fields})`
  return [
    ...doc,
    `export const ${name} = ${call}`,
    "",
    ...exportDoc(undefined, `The \`${message.fullName}\` message, as decoded by {@link ${name}}.`, []),
    `export interface ${name} extends ${schema}.Schema.Type<typeof ${name}> {}`
  ].join("\n")
}

const renderEnum = (ctx: Context, t: EnumType): string => {
  const name = t.tsName
  const doc = exportDoc(comment(ctx, t.path), `Schema for the \`${t.fullName}\` enum.`, [
    deprecatedTag(ctx, t.desc.options?.deprecated)
  ])
  const protobuf = useProtobuf(ctx)
  const values = t.desc.value.flatMap((v, i) => [
    ...jsDoc(comment(ctx, [...t.path, ENUM_VALUE, i]), [deprecatedTag(ctx, v.options?.deprecated)], "  "),
    `  ${propertyKey(v.name ?? "")}: ${v.number}${i < t.desc.value.length - 1 ? "," : ""}`
  ])
  if (values.length === 0) throw new GeneratorError(`${t.fullName}: an enum needs a value`)
  return [
    ...doc,
    [
      `export const ${name} = ${protobuf}.${t.open ? "OpenEnum" : "Enum"}(${JSON.stringify(t.fullName)}, {`,
      ...values,
      "})"
    ].join("\n"),
    "",
    ...exportDoc(undefined, `The values of the \`${t.fullName}\` enum.`, []),
    `export type ${name} = typeof ${name}.Type`
  ].join("\n")
}

const renderExtension = (ctx: Context, extension: Extension): string => {
  const field = extension.desc
  const where = extension.fullName
  const extendee = lookupMessage(ctx, field.extendee ?? "", where)
  const features = fieldFeatures(ctx.edition, extension.features, field)
  // Extensions follow every message of the file, so they need no suspend.
  const v = renderFieldValue(ctx, undefined, field, where)
  const messageSet = extendee.desc.options?.messageSetWireFormat === true
  // The full name is the key of the extension in JSON.
  const options = renderOptions({
    name: where,
    ...(messageSet ? undefined : featureOptions(ctx, field, features))
  })
  if (messageSet && (!isMessage(field) || label(field) === "repeated")) {
    throw new GeneratorError(`${where}: the extensions of a MessageSet are messages`)
  }
  const doc = exportDoc(comment(ctx, extension.path), `The \`${where}\` extension.`, [
    deprecatedTag(ctx, field.options?.deprecated)
  ])
  return [
    ...doc,
    `export const ${extension.tsName} = ${useProtobuf(ctx)}.extension(${
      renderMessageRef(ctx, field.extendee ?? "", undefined, where)
    }, ${field.number ?? 0}, ${v}${options === undefined ? "" : `, ${options}`})`
  ].join("\n")
}

const renderRegistry = (ctx: Context, local: ReadonlyArray<NamedType>, extensions: ReadonlyArray<Extension>) => {
  // A Set, since files mapped to the same module share its registry.
  const entries = new Set<string>()
  for (const t of local) {
    if (t._tag === "message") entries.add(t.tsName)
  }
  for (const extension of extensions) entries.add(extension.tsName)
  for (const dependency of ctx.file.dependency) {
    if (Object.hasOwn(wellKnownFiles, dependency)) {
      for (const typeName of wellKnownFiles[dependency]) {
        entries.add(renderMessageRef(ctx, typeName, undefined, ctx.fileName))
      }
      continue
    }
    const module = moduleOfFile(ctx, dependency)
    if (module !== undefined) entries.add(`${module}.registry`)
  }
  return [
    ...exportDoc(
      undefined,
      `The messages and extensions of \`${ctx.fileName}\` and of its imports, for \`Protobuf.anyUnpack\`.`,
      []
    ),
    entries.size === 0
      ? `export const registry = ${useProtobuf(ctx)}.registry()`
      : [`export const registry = ${useProtobuf(ctx)}.registry(`, `  ${[...entries].join(",\n  ")}`, ")"].join("\n")
  ].join("\n")
}

/** Services are not generated yet, so the module notes each one it leaves out. */
const renderService = (ctx: Context, service: ServiceDescriptorProto): string => {
  const fullName = ctx.file.package ? `${ctx.file.package}.${service.name}` : service.name ?? ""
  return `// service ${fullName} is not generated: protoc-gen-effect does not support services yet`
}
