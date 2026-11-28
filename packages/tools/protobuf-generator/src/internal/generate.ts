/**
 * Generates one TypeScript module per `.proto` file: the file's descriptor,
 * resolved when the module loads; per message an interface of its values and
 * its `MessageDescriptor`, under the same name; per enum an object of its
 * numbers by name and the type of its values; per extension and service its
 * descriptor.
 */
import * as Codegen from "effect/Codegen"
import * as Data from "effect/Data"
import * as ProtobufDescriptor from "effect/protobuf/ProtobufDescriptor"
import * as ProtobufDescriptorProto from "effect/protobuf/ProtobufDescriptorProto"
import * as ProtobufMessage from "effect/protobuf/ProtobufMessage"
import * as Result from "effect/Result"

/** Input the generator cannot represent, reported in the response. */
export class GeneratorError extends Data.TaggedError("GeneratorError")<{
  readonly message: string
}> {}

/** `importExtension`: the extension of imports between generated modules. */
export interface Options {
  readonly importExtension: "js" | "ts" | "none"
}

/** A generated module: its path relative to the output directory, and its source. */
export interface GeneratedFile {
  readonly name: string
  readonly content: string
}

/** The `.proto` files that effect/protobuf has modules of, which imports of them use. */
const shipped: ReadonlyMap<string, string> = new Map([
  ["google/protobuf/descriptor.proto", "ProtobufDescriptorProto"],
  ["google/protobuf/compiler/plugin.proto", "ProtobufPluginProto"]
])

// Field numbers of `descriptor.proto`, for paths into `SourceCodeInfo`.
const FILE_MESSAGE_TYPE = 4
const FILE_ENUM_TYPE = 5
const FILE_SERVICE = 6
const FILE_EXTENSION = 7
const MESSAGE_FIELD = 2
const MESSAGE_NESTED_TYPE = 3
const MESSAGE_ENUM_TYPE = 4
const MESSAGE_EXTENSION = 6
const MESSAGE_ONEOF_DECL = 8
const ENUM_VALUE = 2

/** Globals that generated code uses, which its declarations must not shadow. */
const globals: ReadonlyArray<string> = ["Object", "ReadonlyArray", "Uint8Array"]

/** `acme/v1/user-events.proto` → `userEventsFile` */
const fileConstName = (protoFile: string): string => {
  const base = protoFile.split("/").pop()!.replace(/\.proto$/, "")
  const camel = base.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ?? "").toUpperCase())
  const name = `${camel.charAt(0).toLowerCase()}${camel.slice(1)}File`
  return /^[0-9]/.test(name) ? `_${name}` : name
}

/** `acme/v1/user.proto` → `acme_v1_user_proto` */
const importAlias = (protoFile: string): string => {
  const alias = protoFile.replace(/\.proto$/, "").replace(/[^A-Za-z0-9_]/g, "_") + "_proto"
  return /^[0-9]/.test(alias) ? `_${alias}` : alias
}

/** `acme/v1/user.proto` → `acme/v1/user.proto.ts` */
const moduleName = (protoFile: string): string => `${protoFile.replace(/\.proto$/, "")}.proto.ts`

/** The relative path from the directory of `from` to `to`. */
const relativePath = (from: string, to: string): string => {
  const fromDir = from.split("/").slice(0, -1)
  const target = to.split("/")
  let common = 0
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) common++
  const up = fromDir.length - common
  return (up === 0 ? "./" : "../".repeat(up)) + target.slice(common).join("/")
}

const withExtension = (path: string, extension: Options["importExtension"]): string => {
  const base = path.replace(/\.ts$/, "")
  return extension === "none" ? base : `${base}.${extension}`
}

/** The name of a type in its file's module: `acme.v1.Outer.Inner` → `Outer_Inner`. */
const scopedName = (descriptor: { readonly typeName: string; readonly file: ProtobufDescriptor.FileDescriptor }) =>
  (descriptor.file.package === "" ? descriptor.typeName : descriptor.typeName.slice(descriptor.file.package.length + 1))
    .replaceAll(".", "_")

// -----------------------------------------------------------------------------
// comments
// -----------------------------------------------------------------------------

/** The comments of a file's declarations, by `SourceCodeInfo` path. */
const commentsOf = (proto: ProtobufDescriptorProto.FileDescriptorProto): ReadonlyMap<string, string> => {
  const out = new Map<string, string>()
  for (const location of proto.source_code_info?.location ?? []) {
    const text = (location.leading_comments || location.trailing_comments || "").trim()
    if (text !== "") out.set((location.path ?? []).join("."), text)
  }
  return out
}

/** A JSDoc comment at `indent`; a one-line comment stays on one line. */
const docComment = (comment: string, indent = ""): string => {
  if (comment === "") return ""
  const lines = comment.replaceAll("*/", "*\\/").split("\n").map((line) => line.replace(/^ ?/, "").trimEnd())
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`
  return `${indent}/**\n${lines.map((line) => `${indent} *${line ? ` ${line}` : ""}\n`).join("")}${indent} */\n`
}

// -----------------------------------------------------------------------------
// the descriptor literal
// -----------------------------------------------------------------------------

/** A message value reduced to what its literal writes. */
type Compact =
  | string
  | number
  | bigint
  | boolean
  | Uint8Array
  | ReadonlyArray<Compact>
  | {
    readonly _tag: "Object"
    readonly entries: ReadonlyArray<readonly [key: Codegen.Fragment, value: Compact]>
    readonly unknownFields?: Uint8Array | undefined
  }

/**
 * A message value: its fields by field number, without absent fields and
 * empty lists and maps, and its unknown fields, such as custom options.
 */
const compact = (
  message: ProtobufDescriptor.MessageDescriptor,
  value: Record<PropertyKey, unknown>,
  omit: ReadonlySet<string> = new Set()
): Compact => {
  const entries: Array<readonly [Codegen.Fragment, Compact]> = []
  const element = (type: ProtobufDescriptor.ValueType, item: unknown): Compact =>
    type.kind === "message"
      ? compact(type.message, item as Record<PropertyKey, unknown>)
      : item as Compact
  const oneofs = new Set<ProtobufDescriptor.OneofDescriptor>()
  for (const field of [...message.fields].sort((a, b) => a.number - b.number)) {
    if (omit.has(field.name)) continue
    if (field.oneof !== undefined) {
      if (oneofs.has(field.oneof)) continue
      oneofs.add(field.oneof)
      const set = value[field.oneof.name] as { readonly _tag: string; readonly value: unknown } | undefined
      if (set === undefined) continue
      const member = field.oneof.fields.find((f) => f.name === set._tag)!
      entries.push([Codegen.propertyKey(field.oneof.name), {
        _tag: "Object",
        entries: [["_tag", set._tag], ["value", element(member.type, set.value)]]
      }])
      continue
    }
    const item = value[field.name]
    if (item === undefined) continue
    if (field.kind === "list") {
      const items = item as ReadonlyArray<unknown>
      if (items.length > 0) entries.push([field.name, items.map((x) => element(field.type, x))])
    } else if (field.kind === "map") {
      const items = Object.entries(item as Record<string, unknown>)
      if (items.length > 0) {
        entries.push([field.name, {
          _tag: "Object",
          entries: items.map(([k, v]) => [Codegen.propertyKey(k), element(field.type, v)] as const)
        }])
      }
    } else {
      entries.push([Codegen.propertyKey(field.name), element(field.type, item)])
    }
  }
  const unknown = value[ProtobufMessage.unknownFields]
  return { _tag: "Object", entries, unknownFields: unknown instanceof Uint8Array ? unknown : undefined }
}

const hasUnknownFields = (value: Compact): boolean =>
  Array.isArray(value)
    ? value.some(hasUnknownFields)
    : typeof value === "object" && "_tag" in value &&
      (value.unknownFields !== undefined || value.entries.some(([, item]) => hasUnknownFields(item)))

/**
 * A literal that stays on one line when it fits in 110 columns at its depth.
 * Unknown fields are added by `withUnknownFields(value, bytes)`.
 */
const literal = (
  value: Compact,
  render: Codegen.Render,
  withUnknownFields: Codegen.Binding,
  depth = 0
): string => {
  if (typeof value === "bigint") return `${value}n`
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return Codegen.literal(value)
  if (value instanceof Uint8Array) return `new Uint8Array([${value.join(", ")}])`
  const array = Array.isArray(value)
  const object = value as Extract<Compact, { _tag: "Object" }>
  const parts = array
    ? (value as ReadonlyArray<Compact>).map((item) => literal(item, render, withUnknownFields, depth + 1))
    : object.entries.map(([key, item]) => `${render(key)}: ${literal(item, render, withUnknownFields, depth + 1)}`)
  const [open, close] = array ? ["[", "]"] : ["{", "}"]
  const indent = "  ".repeat(depth)
  const group = (parts: ReadonlyArray<string>, open: string, close: string, space: string) => {
    if (parts.length === 0) return open + close
    const inline = `${open}${space}${parts.join(", ")}${space}${close}`
    if (!inline.includes("\n") && depth * 2 + inline.length <= 110) return inline
    return `${open}\n${parts.map((part) => `${indent}  ${part}`).join(",\n")}\n${indent}${close}`
  }
  const out = group(parts, open, close, array ? "" : " ")
  if (array || object.unknownFields === undefined) return out
  const bytes = literal(object.unknownFields, render, withUnknownFields)
  return group([out, bytes], `${render(withUnknownFields)}(`, ")", "")
}

// -----------------------------------------------------------------------------
// modules
// -----------------------------------------------------------------------------

const namespaceImport = (module: string, local: string, typeOnly = false): Codegen.Import => ({
  module,
  kind: "Namespace",
  imported: "*",
  local,
  typeOnly,
  attributes: ""
})

const generateModule = (
  file: ProtobufDescriptor.FileDescriptor,
  options: Options
): Result.Result<GeneratedFile, GeneratorError> => {
  const outName = moduleName(file.name)
  // The module of a file that this module imports.
  const moduleOf = (other: ProtobufDescriptor.FileDescriptor): string => {
    const module = shipped.get(other.name)
    return module !== undefined
      ? `effect/protobuf/${module}`
      : withExtension(relativePath(outName, moduleName(other.name)), options.importExtension)
  }

  const comments = commentsOf(file.proto)
  const commentAt = (path: ReadonlyArray<number>): string => comments.get(path.join(".")) ?? ""

  const module = new Codegen.Module(globals)

  // Imports, in the order they are printed.
  const ProtobufDescriptorValue = module.addImport(
    namespaceImport("effect/protobuf/ProtobufDescriptor", "ProtobufDescriptor")
  )
  const ProtobufDescriptorType = module.addImport(
    namespaceImport("effect/protobuf/ProtobufDescriptor", "ProtobufDescriptor", true)
  )
  const ProtobufMessageValue = module.addImport(namespaceImport("effect/protobuf/ProtobufMessage", "ProtobufMessage"))
  const ResultValue = module.addImport(namespaceImport("effect/Result", "Result"))
  const imports = new Map<string, { readonly types: Codegen.Binding; readonly values: Codegen.Binding }>()
  const importOf = (other: ProtobufDescriptor.FileDescriptor) => {
    let ref = imports.get(other.name)
    if (ref === undefined) {
      const from = moduleOf(other)
      const local = shipped.get(other.name) ?? importAlias(other.name)
      ref = {
        values: module.addImport(namespaceImport(from, local)),
        types: module.addImport(namespaceImport(from, local, true))
      }
      imports.set(other.name, ref)
    }
    return ref
  }
  // effect's modules before the relative imports of generated modules.
  for (const dependency of file.dependencies) if (shipped.has(dependency.name)) importOf(dependency)
  for (const dependency of file.dependencies) importOf(dependency)

  // A name of the module's API. Names that generated code reserves get a `$`,
  // the same in every generated module, so that other modules find them.
  const apiName = (name: string): string => module.isReserved(name) ? `${name}$` : name

  // Names are declared first, so that every reference knows them. Two
  // declarations with the same name are an error of the input.
  type Named =
    | ProtobufDescriptor.MessageDescriptor
    | ProtobufDescriptor.EnumDescriptor
    | ProtobufDescriptor.ExtensionDescriptor
    | ProtobufDescriptor.ServiceDescriptor
  const named: Array<Named> = []
  const collect = (messages: ReadonlyArray<ProtobufDescriptor.MessageDescriptor>): void => {
    for (const message of messages) {
      named.push(message)
      collect(message.messages)
      named.push(...message.enums, ...message.extensions)
    }
  }
  collect(file.messages)
  named.push(...file.enums, ...file.extensions, ...file.services)
  const declared = new Map<string, string>([[apiName(fileConstName(file.name)), "the file descriptor"]])
  for (const descriptor of named) {
    const exact = apiName(scopedName(descriptor))
    const other = declared.get(exact)
    if (other !== undefined) {
      return Result.fail(
        new GeneratorError({ message: `${file.name}: ${other} and ${descriptor.typeName} are both named ${exact}` })
      )
    }
    declared.set(exact, descriptor.typeName)
  }
  const fileConst = module.declare(apiName(fileConstName(file.name)), { exact: true })
  const names = new Map(
    named.map((descriptor) => [descriptor, module.declare(apiName(scopedName(descriptor)), { exact: true })] as const)
  )

  const typeRef = (
    descriptor: ProtobufDescriptor.MessageDescriptor | ProtobufDescriptor.EnumDescriptor
  ): Codegen.CodeHole =>
    descriptor.file === file
      ? names.get(descriptor)!
      : Codegen.code`${importOf(descriptor.file).types}.${apiName(scopedName(descriptor))}`

  const valueType = (type: ProtobufDescriptor.ValueType): Codegen.CodeHole => {
    switch (type.kind) {
      case "message":
        return typeRef(type.message)
      case "enum":
        // An open enum also holds numbers it does not declare.
        return type.enum.open ? "number" : typeRef(type.enum)
      case "scalar":
        switch (type.scalar) {
          case "int64":
          case "uint64":
          case "sint64":
          case "fixed64":
          case "sfixed64":
            return type.jsType
          case "bool":
            return "boolean"
          case "string":
            return "string"
          case "bytes":
            return "Uint8Array"
          default:
            return "number"
        }
    }
  }

  const fieldType = (field: ProtobufDescriptor.FieldDescriptor): Codegen.CodeHole => {
    switch (field.kind) {
      case "singular":
        return valueType(field.type)
      case "list":
        return Codegen.code`ReadonlyArray<${valueType(field.type)}>`
      case "map":
        return Codegen.code`{ readonly [key: string]: ${valueType(field.type)} }`
    }
  }

  // The file descriptor. Unknown fields, such as custom options, are added by
  // a helper: the interfaces of messages do not declare their key.
  const descriptorValue = compact(
    ProtobufDescriptorProto.FileDescriptorProto,
    file.proto as Record<PropertyKey, unknown>,
    new Set(["source_code_info"])
  )
  const withUnknownFields = module.declare("$withUnknownFields")
  const usesUnknownFields = hasUnknownFields(descriptorValue)
  if (usesUnknownFields) {
    module.define(withUnknownFields, [
      Codegen.code`const ${withUnknownFields} = <A extends object>(value: A, bytes: Uint8Array): A =>
  Object.assign(value, { [${ProtobufMessageValue}.unknownFields]: bytes })`
    ])
  }
  const descriptorLiteral = Codegen.deferred((render) => literal(descriptorValue, render, withUnknownFields))
  const dependencies = file.dependencies.map((dependency) =>
    Codegen.code`${importOf(dependency).values}.${apiName(fileConstName(dependency.name))}`
  )
  const dependencyList = Codegen.code`[${Codegen.join(dependencies, ", ")}]`
  const resolved = Codegen.code`${ResultValue}.getOrThrow(${ProtobufDescriptorValue}.make([${descriptorLiteral}]${
    dependencies.length > 0 ? Codegen.code`, { dependencies: ${dependencyList} }` : ""
  })).files[0]`
  module.define(fileConst, [
    Codegen.code`${
      docComment(`The resolved \`${file.name}\`.`)
    }export const ${fileConst}: ${ProtobufDescriptorType}.FileDescriptor = ${resolved}`
  ], usesUnknownFields ? [withUnknownFields] : [])

  const addEnum = (e: ProtobufDescriptor.EnumDescriptor, path: ReadonlyArray<number>): void => {
    const binding = names.get(e)!
    const values = e.values.map((value, i) =>
      `${docComment(commentAt([...path, ENUM_VALUE, i]), "  ")}  ${Codegen.propertyKey(value.name)}: ${
        Codegen.literal(value.number)
      }`
    )
    module.define(binding, [
      Codegen.code`${docComment(commentAt(path) || `The values of \`${e.typeName}\`.`)}export const ${binding} = {
${values.join(",\n")}
} as const`,
      Codegen.code`${
        docComment(`A value of \`${e.typeName}\`.`)
      }export type ${binding} = (typeof ${binding})[keyof typeof ${binding}]`
    ])
  }

  const addExtension = (
    extension: ProtobufDescriptor.ExtensionDescriptor,
    path: ReadonlyArray<number>,
    parent: Codegen.DeclarationBinding,
    index: number
  ): void => {
    const binding = names.get(extension)!
    const comment = commentAt(path)
    const summary = `The extension \`${extension.typeName}\` of \`${extension.extendee.typeName}\`.`
    module.define(binding, [
      Codegen.code`${
        docComment(comment === "" ? summary : `${comment}\n\n${summary}`)
      }export const ${binding}: ${ProtobufDescriptorType}.ExtensionDescriptor = ${parent}.extensions[${index}]`
    ], [parent])
  }

  const addMessage = (
    message: ProtobufDescriptor.MessageDescriptor,
    path: ReadonlyArray<number>,
    parent: Codegen.DeclarationBinding,
    index: number
  ): void => {
    const binding = names.get(message)!
    const members: Array<Codegen.Fragment> = []
    const oneofs = new Set<ProtobufDescriptor.OneofDescriptor>()
    const fieldPath = (field: ProtobufDescriptor.FieldDescriptor) => [
      ...path,
      MESSAGE_FIELD,
      message.proto.field!.indexOf(field.proto)
    ]
    for (const field of message.fields) {
      if (field.oneof !== undefined) {
        if (oneofs.has(field.oneof)) continue
        oneofs.add(field.oneof)
        const cases = field.oneof.fields.map((member) =>
          Codegen.code`    | {
      readonly _tag: ${Codegen.literal(member.name)}
${docComment(commentAt(fieldPath(member)), "      ")}      readonly value: ${fieldType(member)}
    }`
        )
        const oneofPath = [...path, MESSAGE_ONEOF_DECL, (message.proto.oneof_decl ?? []).indexOf(field.oneof.proto)]
        members.push(
          Codegen.code`${docComment(commentAt(oneofPath), "  ")}  readonly ${Codegen.propertyKey(field.oneof.name)}?:
${Codegen.join(cases, "\n")}`
        )
        continue
      }
      const optional = field.kind === "singular" && field.presence === "required" ? "" : "?"
      members.push(
        Codegen.code`${docComment(commentAt(fieldPath(field)), "  ")}  readonly ${
          Codegen.propertyKey(field.name)
        }${optional}: ${fieldType(field)}`
      )
    }
    const body = members.length === 0 ? "{}" : Codegen.code`{\n${Codegen.join(members, "\n")}\n}`
    module.define(binding, [
      Codegen.code`${
        docComment(commentAt(path) || `The fields of \`${message.typeName}\`.`)
      }export interface ${binding} ${body}`,
      Codegen.code`${
        docComment(`The descriptor of \`${message.typeName}\`.`)
      }export const ${binding}: ${ProtobufDescriptorType}.MessageDescriptor = ${parent}.messages[${index}]`
    ], [parent])
    const nested = message.proto.nested_type ?? []
    message.messages.forEach((child, i) =>
      addMessage(child, [...path, MESSAGE_NESTED_TYPE, nested.indexOf(child.proto)], binding, i)
    )
    const enums = message.proto.enum_type ?? []
    for (const e of message.enums) addEnum(e, [...path, MESSAGE_ENUM_TYPE, enums.indexOf(e.proto)])
    const extensions = message.proto.extension ?? []
    message.extensions.forEach((x, i) =>
      addExtension(x, [...path, MESSAGE_EXTENSION, extensions.indexOf(x.proto)], binding, i)
    )
  }

  const messageTypes = file.proto.message_type ?? []
  file.messages.forEach((message, i) =>
    addMessage(message, [FILE_MESSAGE_TYPE, messageTypes.indexOf(message.proto)], fileConst, i)
  )
  const enumTypes = file.proto.enum_type ?? []
  for (const e of file.enums) addEnum(e, [FILE_ENUM_TYPE, enumTypes.indexOf(e.proto)])
  const extensions = file.proto.extension ?? []
  file.extensions.forEach((x, i) => addExtension(x, [FILE_EXTENSION, extensions.indexOf(x.proto)], fileConst, i))
  const services = file.proto.service ?? []
  file.services.forEach((service, i) => {
    const binding = names.get(service)!
    const comment = commentAt([FILE_SERVICE, services.indexOf(service.proto)])
    module.define(binding, [
      Codegen.code`${
        docComment(comment || `The descriptor of \`${service.typeName}\`.`)
      }export const ${binding}: ${ProtobufDescriptorType}.ServiceDescriptor = ${fileConst}.services[${i}]`
    ], [fileConst])
  })

  const header = `// @generated by protoc-gen-effect from ${file.name}. Do not edit.\n\n`
  return Result.succeed({ name: outName, content: header + module.print() })
}

/** The generated modules of `fileToGenerate`, resolved among `protoFile`, as a plugin request lists them. */
export const generateFiles = (
  protoFile: ReadonlyArray<ProtobufDescriptorProto.FileDescriptorProto>,
  fileToGenerate: ReadonlyArray<string>,
  options: Options
): Result.Result<Array<GeneratedFile>, GeneratorError> =>
  Result.gen(function*() {
    const registry = yield* Result.mapError(
      ProtobufDescriptor.make(protoFile),
      (error) => new GeneratorError({ message: error.message })
    )
    const files: Array<GeneratedFile> = []
    for (const name of fileToGenerate) {
      const file = registry.getFile(name)
      if (file === undefined) {
        return yield* Result.fail(new GeneratorError({ message: `${name} is not among the request's files` }))
      }
      files.push(yield* generateModule(file, options))
    }
    return files
  })
