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
import { editionName, fieldType, fileEdition, jsType, label } from "./descriptor.ts"
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
  safeIdentifier,
  snakeCase
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
   * The modules of `.proto` files that are generated elsewhere, such as in a
   * library, which are imported rather than generated. A key is a file, such
   * as `acme/common/v1/common.proto`, or a directory ending in `/`, whose
   * specifier ends in `/` too and is followed by the rest of the path, such as
   * `acme/common/` and `@acme/common-proto/`.
   */
  readonly protoMap?: Readonly<Record<string, string>> | undefined
}

export interface GeneratedFile {
  readonly name: string
  readonly content: string
}

/**
 * Generates a module for each file in `filesToGenerate`; `files` holds them
 * and all of their dependencies.
 */
export const generateFiles = (
  files: ReadonlyArray<FileDescriptorProto>,
  filesToGenerate: ReadonlyArray<string>,
  options: Options
): Array<GeneratedFile> => {
  const registry = buildRegistry(files)
  const byName = new Map(files.map((file) => [file.name ?? "", file]))
  return filesToGenerate.map((name) => {
    const file = byName.get(name)
    if (file === undefined) throw new GeneratorError(`${name}: missing from the request`)
    return generateFile(file, registry, options)
  })
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

/** Keyed by fully qualified name with the leading dot, as in `type_name`. */
interface Registry extends ReadonlyMap<string, NamedType> {}

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
  const registry = new Map<string, NamedType>()
  for (const file of files) {
    const fileFeatures = mergeFeatures(editionDefaults(fileEdition(file)), file.options?.features)
    const addEnum = (
      desc: EnumDescriptorProto,
      scope: string,
      tsScope: string,
      path: ReadonlyArray<number>,
      parent: Features
    ) => {
      const name = desc.name ?? ""
      const fullName = `${scope}.${name}`
      registry.set(fullName, {
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
      registry.set(fullName, {
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
  }
  return registry
}

/** The extensions declared in a file, at its top level and in its messages. */
const fileExtensions = (file: FileDescriptorProto, registry: Registry): Array<Extension> => {
  const out: Array<Extension> = []
  const scope = file.package ? `${file.package}.` : ""
  const fileFeatures = mergeFeatures(editionDefaults(fileEdition(file)), file.options?.features)
  file.extension.forEach((desc, i) => {
    const name = desc.name ?? ""
    out.push({
      fullName: `${scope}${name}`,
      tsName: safeIdentifier(protoCamelCase(name)),
      desc,
      path: [FILE_EXTENSION, i],
      features: fileFeatures
    })
  })
  for (const t of registry.values()) {
    if (t.file !== file || t._tag !== "message") continue
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

/** Well-known types with a schema in `effect/protobuf/Protobuf`. */
const wellKnownTypes: Record<string, string> = {
  ".google.protobuf.Timestamp": "Timestamp",
  ".google.protobuf.Duration": "Duration",
  ".google.protobuf.Empty": "Empty",
  ".google.protobuf.Value": "Value",
  ".google.protobuf.Struct": "Struct",
  ".google.protobuf.ListValue": "ListValue",
  ".google.protobuf.Any": "Any",
  ".google.protobuf.FieldMask": "FieldMask",
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

const wellKnownEnums: Record<string, string> = {
  ".google.protobuf.NullValue": "NullValue"
}

/** The `.proto` files of the well-known types, which have no generated module, and their messages. */
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

/** `.proto` files whose types are modules of `effect`, the defaults of `protoMap`. */
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

/** The module that `protoMap` maps a `.proto` file to. */
const protoMapModule = (options: Options, name: string): string | undefined => {
  for (const [key, specifier] of Object.entries(options.protoMap ?? {})) {
    if (key.endsWith("/") !== specifier.endsWith("/")) {
      throw new GeneratorError(`proto map ${key}=${specifier}: a directory maps to a specifier ending in /`)
    }
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

/** Whether `protoMap` maps a `.proto` file to a module generated elsewhere, so it is not generated. */
export const isMapped = (name: string, options: Options): boolean => protoMapModule(options, name) !== undefined

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
  const local: Array<NamedType> = []
  for (const t of registry.values()) {
    if (t.file === file && !(t._tag === "message" && t.mapEntry)) local.push(t)
  }
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
  for (const component of order) {
    for (const t of component) {
      names.push([t.tsName, `${t._tag} ${t.fullName}`])
      if (t._tag === "enum") {
        blocks.push(renderEnum(ctx, t))
        continue
      }
      blocks.push(renderMessage(ctx, t))
    }
  }
  const extensions = fileExtensions(file, registry)
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

const useModule = (ctx: Context, specifier: string, alias: string): string => {
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

/** Generated names must be unique, since nested names are flattened. */
const checkNames = (ctx: Context, declared: ReadonlyArray<readonly [string, string]>) => {
  const seen = new Map<string, string>()
  const add = (name: string, source: string) => {
    const previous = seen.get(name)
    if (previous !== undefined) {
      throw new GeneratorError(`${ctx.fileName}: ${previous} and ${source} would both be generated as ${name}`)
    }
    seen.set(name, source)
  }
  for (const alias of ctx.imports.values()) add(alias, `the import of ${alias}`)
  for (const [name, source] of declared) add(name, source)
}

// -----------------------------------------------------------------------------
// ordering
// -----------------------------------------------------------------------------

/** The types of the same file that the fields of a message refer to, through map entries. */
const dependencies = (t: NamedType, registry: Registry): Array<NamedType> => {
  if (t._tag === "enum") return []
  const out: Array<NamedType> = []
  const visit = (desc: DescriptorProto) => {
    for (const field of desc.field) {
      if (field.typeName === undefined) continue
      const dependency = registry.get(field.typeName)
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
 * The JSDoc of an export: its description, with a default for an undocumented
 * declaration and the paragraphs after the first under `**Details**`, and its
 * tags.
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
  const t = ctx.registry.get(typeName)
  if (t === undefined) throw new GeneratorError(`${where}: unknown type ${typeName}`)
  return t
}

const lookupMessage = (ctx: Context, typeName: string, where: string): MessageType => {
  const t = lookup(ctx, typeName, where)
  if (t._tag !== "message") throw new GeneratorError(`${where}: ${typeName.slice(1)} is not a message`)
  return t
}

const renderMessageRef = (ctx: Context, typeName: string, from: MessageType | undefined, where: string): string => {
  const wkt = wellKnownTypes[typeName]
  if (wkt !== undefined) {
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
  const wkt = wellKnownEnums[typeName]
  if (wkt !== undefined) return `${useProtobuf(ctx)}.${wkt}`
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

// A 64-bit integer as a `bigint`, or as `[jstype]` asks.
const int64Scalar = (ctx: Context, field: FieldDescriptorProto, name: string): string => {
  switch (jsType(field)) {
    case "number":
      return protobufScalar(ctx, `${name}Number`)
    case "string":
      return protobufScalar(ctx, `${name}String`)
    default:
      return protobufScalar(ctx, name)
  }
}

// `from` is the message of the field, which may refer to the messages of its
// reference cycle only through `Schema.suspend`.
const renderValue = (
  ctx: Context,
  field: FieldDescriptorProto,
  from: MessageType | undefined,
  where: string
): string => {
  switch (fieldType(field)) {
    case "double":
      return protobufScalar(ctx, "Double")
    case "float":
      return protobufScalar(ctx, "Float")
    case "int32":
      return protobufScalar(ctx, "Int32")
    case "uint32":
      return protobufScalar(ctx, "UInt32")
    case "sint32":
      return protobufScalar(ctx, "SInt32")
    case "fixed32":
      return protobufScalar(ctx, "Fixed32")
    case "sfixed32":
      return protobufScalar(ctx, "SFixed32")
    case "int64":
      return int64Scalar(ctx, field, "Int64")
    case "uint64":
      return int64Scalar(ctx, field, "UInt64")
    case "sint64":
      return int64Scalar(ctx, field, "SInt64")
    case "fixed64":
      return int64Scalar(ctx, field, "Fixed64")
    case "sfixed64":
      return int64Scalar(ctx, field, "SFixed64")
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
      throw new GeneratorError(`${where}: unknown field type ${field.type}`)
  }
}

/** The key schema of a map, as `Protobuf.Map` takes it. */
const renderMapKey = (ctx: Context, field: FieldDescriptorProto, where: string): string => {
  switch (fieldType(field)) {
    case "string":
      return schemaScalar(ctx, "String")
    case "int32":
      return protobufScalar(ctx, "Int32")
    case "uint32":
      return protobufScalar(ctx, "UInt32")
    case "sint32":
      return protobufScalar(ctx, "SInt32")
    case "fixed32":
      return protobufScalar(ctx, "Fixed32")
    case "sfixed32":
      return protobufScalar(ctx, "SFixed32")
    case "int64":
      return protobufScalar(ctx, "Int64String")
    case "uint64":
      return protobufScalar(ctx, "UInt64String")
    case "sint64":
      return protobufScalar(ctx, "SInt64String")
    case "fixed64":
      return protobufScalar(ctx, "Fixed64String")
    case "sfixed64":
      return protobufScalar(ctx, "SFixed64String")
    case "bool":
      return protobufScalar(ctx, "BoolKey")
    default:
      throw new GeneratorError(`${where}: invalid map key type ${field.type}`)
  }
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
  const entry = ctx.registry.get(field.typeName ?? "")
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
  name: field.name === undefined || field.name === snakeCase(key) ? undefined : field.name,
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
  /** The key in the object literal. */
  readonly property: string
  readonly schema: string
  readonly doc: Array<string>
}

/** The schema of a field, without its presence and `Protobuf.field`. */
const renderFieldValue = (
  ctx: Context,
  message: MessageType | undefined,
  field: FieldDescriptorProto,
  where: string
): { readonly schema: string; readonly collection: boolean } => {
  const entry = mapEntry(ctx, field)
  if (entry !== undefined) {
    const keyField = entry.desc.field.find((f) => f.number === 1)
    const valueField = entry.desc.field.find((f) => f.number === 2)
    if (keyField === undefined || valueField === undefined) {
      throw new GeneratorError(`${where}: invalid map entry ${entry.fullName}`)
    }
    const k = renderMapKey(ctx, keyField, where)
    const v = renderValue(ctx, valueField, message, where)
    return { schema: `${useProtobuf(ctx)}.Map(${k}, ${v})`, collection: true }
  }
  const v = renderValue(ctx, field, message, where)
  if (label(field) === "repeated") return { schema: `${useSchema(ctx)}.Array(${v})`, collection: true }
  return { schema: v, collection: false }
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
  const doc = jsDoc(comment(ctx, path), [
    defaultTag(ctx, field, where),
    deprecatedTag(ctx, field.options?.deprecated)
  ], "  ")
  const v = renderFieldValue(ctx, message, field, where)
  const required = !v.collection && features.fieldPresence === "legacyRequired"
  const optional = !v.collection && !required && (isMessage(field) || features.fieldPresence === "explicit")
  const options = fieldCall(ctx, number, {
    ...nameOptions(field, key),
    ...featureOptions(ctx, field, features),
    required: required && !isMessage(field) ? true : undefined,
    default: defaultValue(ctx, field, where)
  })
  return {
    key,
    property: propertyKey(key),
    schema: `${optional ? `${useSchema(ctx)}.optionalKey(${v.schema})` : v.schema}.pipe(${options})`,
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
  const features = mergeFeatures(message.features, decl?.options?.features)
  const cases = fields.map(([field, i]) => {
    const where = `${message.fullName}.${field.name}`
    const tag = protoCamelCase(field.name ?? "")
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
    property: propertyKey(key),
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

/** protoc C-escapes the defaults of bytes fields. */
const unescapeBytes = (escaped: string, where: string): Array<number> => {
  const out: Array<number> = []
  const simple: Record<string, number> = {
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
  for (let i = 0; i < escaped.length; i++) {
    const c = escaped[i]
    if (c !== "\\") {
      out.push(c.charCodeAt(0))
      continue
    }
    const next = escaped[++i]
    if (next !== undefined && Object.hasOwn(simple, next)) {
      out.push(simple[next])
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

const defaultTag = (ctx: Context, field: FieldDescriptorProto, where: string): string | undefined => {
  const value = defaultValue(ctx, field, where)
  return value === undefined ? undefined : `@default ${value}`
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
  const oneofs = new Map<number, Array<readonly [FieldDescriptorProto, number]>>()
  desc.field.forEach((field, i) => {
    if (!isRealOneof(field)) return
    const group = oneofs.get(field.oneofIndex!)
    if (group === undefined) oneofs.set(field.oneofIndex!, [[field, i]])
    else group.push([field, i])
  })
  const members: Array<Member> = []
  desc.field.forEach((field, i) => {
    if (isRealOneof(field)) {
      const group = oneofs.get(field.oneofIndex!)!
      if (group[0][0] === field) members.push(renderOneof(ctx, message, field.oneofIndex!, group))
      return
    }
    members.push(renderField(ctx, message, field, [...message.path, MESSAGE_FIELD, i]))
  })
  const keys = new Set<string>()
  for (const member of members) {
    if (keys.has(member.key)) {
      throw new GeneratorError(`${message.fullName}: two fields would both be generated as property ${member.key}`)
    }
    keys.add(member.key)
  }
  const schema = useSchema(ctx)
  const name = message.tsName
  const doc = exportDoc(comment(ctx, message.path), `Schema for the \`${message.fullName}\` message.`, [
    deprecatedTag(ctx, desc.options?.deprecated)
  ])
  const fields = members.length === 0
    ? "{}"
    : [
      "{",
      ...members.flatMap((m, i) => [...m.doc, `  ${m.property}: ${m.schema}${i < members.length - 1 ? "," : ""}`]),
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
    }, ${field.number ?? 0}, ${v.schema}${options === undefined ? "" : `, ${options}`})`
  ].join("\n")
}

const renderRegistry = (ctx: Context, local: ReadonlyArray<NamedType>, extensions: ReadonlyArray<Extension>) => {
  const entries: Array<string> = []
  for (const t of local) {
    if (t._tag === "message") entries.push(t.tsName)
  }
  for (const extension of extensions) entries.push(extension.tsName)
  for (const dependency of ctx.file.dependency) {
    if (Object.hasOwn(wellKnownFiles, dependency)) {
      for (const typeName of wellKnownFiles[dependency]) {
        entries.push(renderMessageRef(ctx, typeName, undefined, ctx.fileName))
      }
      continue
    }
    const module = moduleOfFile(ctx, dependency)
    if (module !== undefined) entries.push(`${module}.registry`)
  }
  return [
    ...exportDoc(
      undefined,
      `The messages and extensions of \`${ctx.fileName}\` and of its imports, for \`Protobuf.anyUnpack\`.`,
      []
    ),
    entries.length === 0
      ? `export const registry = ${useProtobuf(ctx)}.registry()`
      : [`export const registry = ${useProtobuf(ctx)}.registry(`, `  ${entries.join(",\n  ")}`, ")"].join("\n")
  ].join("\n")
}

/**
 * Services become an `RpcGroup` once ConnectRPC support lands in
 * `effect/rpc`. Until then, the module lists the services it leaves out.
 */
const renderService = (ctx: Context, service: ServiceDescriptorProto): string => {
  const fullName = ctx.file.package ? `${ctx.file.package}.${service.name}` : service.name ?? ""
  return `// service ${fullName} is not generated: protoc-gen-effect does not support services yet`
}
