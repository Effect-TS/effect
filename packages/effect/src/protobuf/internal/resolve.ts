// Resolves `FileDescriptorProto`s into descriptors: types by full name, field
// kinds, and the features of each file's syntax or edition applied to every
// field and enum.
//
// Descriptors refer to each other, so they are built in two passes: first
// every message and enum, by full name, then the fields, extensions and
// services that refer to them.

import type * as D from "../ProtobufDescriptor.ts"

/** @internal */
export class ResolveError extends Error {}

const fail = (message: string): never => {
  throw new ResolveError(message)
}

// -----------------------------------------------------------------------------
// features
// -----------------------------------------------------------------------------

// The numbers of `google.protobuf.Edition`.
const EDITION_PROTO2 = 998
const EDITION_PROTO3 = 999
const EDITION_2023 = 1000
const EDITION_2024 = 1001

// `FieldDescriptorProto.Label` and `.Type`.
const LABEL_REPEATED = 3
const LABEL_REQUIRED = 2
const TYPE_GROUP = 10
const TYPE_MESSAGE = 11
const TYPE_ENUM = 14

const SCALARS: Record<number, D.ScalarType> = {
  1: "double",
  2: "float",
  3: "int64",
  4: "uint64",
  5: "int32",
  6: "fixed64",
  7: "fixed32",
  8: "bool",
  9: "string",
  12: "bytes",
  13: "uint32",
  15: "sfixed32",
  16: "sfixed64",
  17: "sint32",
  18: "sint64"
}

// The resolved features that decide how fields are encoded.
interface Features {
  readonly fieldPresence: "explicit" | "implicit" | "required"
  readonly enumType: "open" | "closed"
  readonly repeatedFieldEncoding: "packed" | "expanded"
  readonly utf8Validation: boolean
  readonly delimited: boolean
}

// The `edition_defaults` of the features in `descriptor.proto`.
const PROTO2: Features = {
  fieldPresence: "explicit",
  enumType: "closed",
  repeatedFieldEncoding: "expanded",
  utf8Validation: false,
  delimited: false
}
const PROTO3: Features = {
  fieldPresence: "implicit",
  enumType: "open",
  repeatedFieldEncoding: "packed",
  utf8Validation: true,
  delimited: false
}
const EDITIONS: Features = {
  fieldPresence: "explicit",
  enumType: "open",
  repeatedFieldEncoding: "packed",
  utf8Validation: true,
  delimited: false
}

const editionOf = (file: D.FileDescriptorProto): { readonly number: number; readonly name: D.EditionName } => {
  switch (file.syntax) {
    case undefined:
    case "":
    case "proto2":
      return { number: EDITION_PROTO2, name: "proto2" }
    case "proto3":
      return { number: EDITION_PROTO3, name: "proto3" }
    case "editions":
      if (file.edition === EDITION_2023) return { number: EDITION_2023, name: "2023" }
      if (file.edition === EDITION_2024) return { number: EDITION_2024, name: "2024" }
      return fail(`${file.name}: edition ${file.edition} is not supported`)
    default:
      return fail(`${file.name}: syntax ${file.syntax} is not supported`)
  }
}

// Overrides the features that a `FeatureSet` sets. Each is a number of its
// enum in `descriptor.proto`; 0 is unset.
const merge = (features: Features, set: D.FeatureSet | undefined): Features => {
  if (set === undefined) return features
  return {
    fieldPresence: set.fieldPresence === 1
      ? "explicit"
      : set.fieldPresence === 2
      ? "implicit"
      : set.fieldPresence === 3
      ? "required"
      : features.fieldPresence,
    enumType: set.enumType === 1 ? "open" : set.enumType === 2 ? "closed" : features.enumType,
    repeatedFieldEncoding: set.repeatedFieldEncoding === 1
      ? "packed"
      : set.repeatedFieldEncoding === 2
      ? "expanded"
      : features.repeatedFieldEncoding,
    utf8Validation: set.utf8Validation === 2 ? true : set.utf8Validation === 3 ? false : features.utf8Validation,
    delimited: set.messageEncoding === 1 ? false : set.messageEncoding === 2 ? true : features.delimited
  }
}

// The features of a field, from those of its parent. proto2 and proto3 spell
// some features with their own syntax.
const fieldFeatures = (edition: number, parent: Features, field: D.FieldDescriptorProto): Features => {
  const features = merge(parent, field.options?.features)
  if (edition !== EDITION_PROTO2 && edition !== EDITION_PROTO3) {
    return field.type === TYPE_GROUP ? { ...features, delimited: true } : features
  }
  return {
    ...features,
    fieldPresence: field.label === LABEL_REQUIRED
      ? "required"
      : field.proto3Optional === true
      ? "explicit"
      : features.fieldPresence,
    repeatedFieldEncoding: field.options?.packed === true
      ? "packed"
      : field.options?.packed === false
      ? "expanded"
      : features.repeatedFieldEncoding,
    delimited: field.type === TYPE_GROUP
  }
}

// -----------------------------------------------------------------------------
// names
// -----------------------------------------------------------------------------

// `foo_bar` → `fooBar`, as protoc computes JSON names.
const camelCase = (name: string): string => {
  let out = ""
  let upper = false
  for (let i = 0; i < name.length; i++) {
    const c = name[i]
    if (c === "_") {
      upper = true
    } else {
      out += upper ? c.toUpperCase() : c
      upper = false
    }
  }
  return out
}

// The property of a field or oneof in a message value. Names of
// `Object.prototype` properties get a `$`, so that every property is a plain
// own data property.
const localName = (name: string): string => {
  const camel = camelCase(name)
  return camel in Object.prototype ? `${camel}$` : camel
}

// `.acme.v1.User` → `acme.v1.User`.
const typeRef = (name: string | undefined, at: string): string => {
  if (name === undefined || !name.startsWith(".")) {
    return fail(`${at}: expected a fully qualified type name, got ${String(name)}`)
  }
  return name.slice(1)
}

// -----------------------------------------------------------------------------
// resolve
// -----------------------------------------------------------------------------

// Descriptors are built mutable, and handed out as the readonly interfaces.
type Mutable<A> = { -readonly [K in keyof A]: A[K] extends ReadonlyArray<infer E> ? Array<E> : A[K] }

interface Pending {
  readonly message: Mutable<D.MessageDescriptor>
  readonly proto: D.DescriptorProto
  readonly features: Features
  readonly edition: number
}

/** @internal */
export const resolve = (protos: Iterable<D.FileDescriptorProto>): D.Registry => {
  const byName = new Map<string, D.FileDescriptorProto>()
  for (const proto of protos) {
    const name = proto.name ?? fail("a file without a name")
    if (byName.has(name)) fail(`${name}: the file is given twice`)
    byName.set(name, proto)
  }
  const files = new Map<string, Mutable<D.FileDescriptor>>()
  const messages = new Map<string, Mutable<D.MessageDescriptor>>()
  const enums = new Map<string, D.EnumDescriptor>()
  const services = new Map<string, D.ServiceDescriptor>()
  const extensions = new Map<string, D.ExtensionDescriptor>()
  const extensionsByExtendee = new Map<string, Map<number, D.ExtensionDescriptor>>()
  const pending: Array<Pending> = []
  const pendingExtensions: Array<
    readonly [
      file: Mutable<D.FileDescriptor>,
      parent: Mutable<D.MessageDescriptor> | undefined,
      proto: D.FieldDescriptorProto,
      features: Features,
      edition: number,
      scope: string
    ]
  > = []
  const pendingMethods: Array<readonly [D.ServiceDescriptor, Array<D.MethodDescriptor>]> = []
  // Map entry messages, by full name, which map fields read.
  const entries = new Map<string, Pending>()

  const define = (typeName: string): void => {
    if (messages.has(typeName) || enums.has(typeName) || services.has(typeName)) {
      fail(`${typeName} is defined twice`)
    }
  }

  const addEnum = (
    file: Mutable<D.FileDescriptor>,
    parent: D.MessageDescriptor | undefined,
    scope: string,
    proto: D.EnumDescriptorProto,
    features: Features
  ): D.EnumDescriptor => {
    const name = proto.name ?? fail(`${scope}: an enum without a name`)
    const typeName = scope === "" ? name : `${scope}.${name}`
    define(typeName)
    const values: Array<D.EnumValueDescriptor> = []
    const out: Mutable<D.EnumDescriptor> = {
      _tag: "EnumDescriptor",
      typeName,
      name,
      file,
      parent,
      values,
      open: merge(features, proto.options?.features).enumType === "open",
      proto
    }
    for (const value of proto.value ?? []) {
      values.push({
        _tag: "EnumValueDescriptor",
        name: value.name ?? fail(`${typeName}: a value without a name`),
        number: value.number ?? fail(`${typeName}.${value.name}: a value without a number`),
        parent: out,
        proto: value
      })
    }
    if (values.length === 0) fail(`${typeName}: an enum without values`)
    enums.set(typeName, out)
    return out
  }

  const addMessage = (
    file: Mutable<D.FileDescriptor>,
    parent: Mutable<D.MessageDescriptor> | undefined,
    scope: string,
    proto: D.DescriptorProto,
    parentFeatures: Features,
    edition: number
  ): Mutable<D.MessageDescriptor> => {
    const name = proto.name ?? fail(`${scope}: a message without a name`)
    const typeName = scope === "" ? name : `${scope}.${name}`
    define(typeName)
    const features = merge(parentFeatures, proto.options?.features)
    const out: Mutable<D.MessageDescriptor> = {
      _tag: "MessageDescriptor",
      typeName,
      name,
      file,
      parent,
      fields: [],
      oneofs: [],
      messages: [],
      enums: [],
      extensions: [],
      messageSetWireFormat: proto.options?.messageSetWireFormat === true,
      proto
    }
    messages.set(typeName, out)
    const entry: Pending = { message: out, proto, features, edition }
    if (proto.options?.mapEntry === true) entries.set(typeName, entry)
    else pending.push(entry)
    for (const nested of proto.nestedType ?? []) {
      const message = addMessage(file, out, typeName, nested, features, edition)
      if (nested.options?.mapEntry !== true) out.messages.push(message)
    }
    for (const nested of proto.enumType ?? []) out.enums.push(addEnum(file, out, typeName, nested, features))
    for (const extension of proto.extension ?? []) {
      pendingExtensions.push([file, out, extension, features, edition, typeName])
    }
    return out
  }

  // Files are added after their dependencies.
  const visiting = new Set<string>()
  const addFile = (name: string, importer: string | undefined): Mutable<D.FileDescriptor> => {
    const done = files.get(name)
    if (done !== undefined) return done
    const proto = byName.get(name)
    if (proto === undefined) {
      return fail(importer === undefined ? `${name} is missing` : `${importer} imports ${name}, which is missing`)
    }
    if (visiting.has(name)) fail(`${name} is part of an import cycle`)
    visiting.add(name)
    const dependencies = (proto.dependency ?? []).map((dependency) => addFile(dependency, name))
    visiting.delete(name)
    const edition = editionOf(proto)
    const features = merge(
      edition.number === EDITION_PROTO2 ? PROTO2 : edition.number === EDITION_PROTO3 ? PROTO3 : EDITIONS,
      proto.options?.features
    )
    const file: Mutable<D.FileDescriptor> = {
      _tag: "FileDescriptor",
      name,
      package: proto.package ?? "",
      edition: edition.name,
      dependencies,
      messages: [],
      enums: [],
      extensions: [],
      services: [],
      proto
    }
    files.set(name, file)
    const scope = file.package
    for (const message of proto.messageType ?? []) {
      file.messages.push(addMessage(file, undefined, scope, message, features, edition.number))
    }
    for (const e of proto.enumType ?? []) file.enums.push(addEnum(file, undefined, scope, e, features))
    for (const extension of proto.extension ?? []) {
      pendingExtensions.push([file, undefined, extension, features, edition.number, scope])
    }
    for (const service of proto.service ?? []) {
      const serviceName = service.name ?? fail(`${name}: a service without a name`)
      const typeName = scope === "" ? serviceName : `${scope}.${serviceName}`
      define(typeName)
      const methods: Array<D.MethodDescriptor> = []
      const out: D.ServiceDescriptor = {
        _tag: "ServiceDescriptor",
        typeName,
        name: serviceName,
        file,
        methods,
        proto: service
      }
      services.set(typeName, out)
      file.services.push(out)
      // Methods refer to messages, which are resolved with the fields.
      pendingMethods.push([out, methods])
    }
    return file
  }
  for (const name of byName.keys()) addFile(name, undefined)

  // A field's value type.
  const valueType = (
    proto: D.FieldDescriptorProto,
    features: Features,
    at: string
  ): D.ValueType => {
    const type = proto.type ?? fail(`${at}: a field without a type`)
    if (type === TYPE_MESSAGE || type === TYPE_GROUP) {
      const typeName = typeRef(proto.typeName, at)
      const message = messages.get(typeName) ?? fail(`${at}: message ${typeName} is not defined`)
      return { kind: "message", message, delimited: features.delimited }
    }
    if (type === TYPE_ENUM) {
      const typeName = typeRef(proto.typeName, at)
      return { kind: "enum", enum: enums.get(typeName) ?? fail(`${at}: enum ${typeName} is not defined`) }
    }
    const scalar = SCALARS[type] ?? fail(`${at}: field type ${type} is not supported`)
    const jstype = proto.options?.jstype
    return {
      kind: "scalar",
      scalar,
      jsType: jstype === 1 ? "string" : jstype === 2 ? "number" : "bigint",
      validateUtf8: features.utf8Validation
    }
  }

  const field = (
    parent: D.MessageDescriptor,
    oneof: D.OneofDescriptor | undefined,
    proto: D.FieldDescriptorProto,
    features: Features,
    at: string
  ): D.FieldDescriptor => {
    const name = proto.name ?? fail(`${at}: a field without a name`)
    const where = `${at}.${name}`
    const base = {
      _tag: "FieldDescriptor" as const,
      name,
      localName: localName(name),
      jsonName: proto.jsonName ?? camelCase(name),
      number: proto.number ?? fail(`${where}: a field without a number`),
      parent,
      oneof,
      proto
    }
    if (proto.label === LABEL_REPEATED) {
      if (proto.type === TYPE_MESSAGE) {
        const entry = entries.get(typeRef(proto.typeName, where))
        if (entry !== undefined) {
          const key = entry.proto.field?.find((f) => f.number === 1) ?? fail(`${where}: a map entry without a key`)
          const value = entry.proto.field?.find((f) => f.number === 2) ?? fail(`${where}: a map entry without a value`)
          const keyType = valueType(key, fieldFeatures(entry.edition, entry.features, key), where)
          if (keyType.kind !== "scalar") return fail(`${where}: a map key of a message or enum type`)
          const valueFeatures = fieldFeatures(entry.edition, entry.features, value)
          // Map values are never encoded as groups.
          return {
            ...base,
            kind: "map",
            key: keyType,
            type: valueType(value, { ...valueFeatures, delimited: false }, where)
          }
        }
      }
      const type = valueType(proto, features, where)
      // Only numbers, booleans and enums can be packed.
      const packable = type.kind === "enum" ||
        (type.kind === "scalar" && type.scalar !== "string" && type.scalar !== "bytes")
      return { ...base, kind: "list", type, packed: packable && features.repeatedFieldEncoding === "packed" }
    }
    const type = valueType(proto, features, where)
    // Messages and fields of oneofs always have explicit presence.
    const presence = features.fieldPresence === "required"
      ? "required"
      : type.kind === "message" || oneof !== undefined
      ? "explicit"
      : features.fieldPresence
    return { ...base, kind: "singular", type, presence }
  }

  for (const { edition, features, message, proto } of [...pending, ...entries.values()]) {
    const at = message.typeName
    const oneofs = (proto.oneofDecl ?? []).map((decl, index): Mutable<D.OneofDescriptor> | undefined => {
      // A synthetic oneof holds only a proto3 `optional` field.
      const members = (proto.field ?? []).filter((f) => f.oneofIndex === index)
      if (members.length > 0 && members.every((f) => f.proto3Optional === true)) return undefined
      const name = decl.name ?? fail(`${at}: a oneof without a name`)
      return { _tag: "OneofDescriptor", name, localName: localName(name), parent: message, fields: [], proto: decl }
    })
    for (const oneof of oneofs) if (oneof !== undefined) message.oneofs.push(oneof)
    for (const f of proto.field ?? []) {
      const oneof = f.oneofIndex === undefined ? undefined : oneofs[f.oneofIndex]
      const fieldFeaturesOf = fieldFeatures(
        edition,
        oneof === undefined ? features : merge(features, oneof.proto.options?.features),
        f
      )
      const out = field(message, oneof, f, fieldFeaturesOf, at)
      message.fields.push(out)
      oneof?.fields.push(out)
    }
  }

  for (const [file, parent, proto, features, edition, scope] of pendingExtensions) {
    const name = proto.name ?? fail(`${scope}: an extension without a name`)
    const typeName = scope === "" ? name : `${scope}.${name}`
    if (extensions.has(typeName)) fail(`${typeName} is defined twice`)
    const extendeeName = typeRef(proto.extendee, typeName)
    const extendee = messages.get(extendeeName) ?? fail(`${typeName}: message ${extendeeName} is not defined`)
    const resolved = field(extendee, undefined, proto, fieldFeatures(edition, features, proto), scope)
    if (resolved.kind === "map") return fail(`${typeName}: an extension cannot be a map`)
    const out: D.ExtensionDescriptor = {
      _tag: "ExtensionDescriptor",
      typeName,
      name,
      file,
      parent,
      extendee,
      // Extensions always have explicit presence.
      field: resolved.kind === "singular" && resolved.presence === "implicit"
        ? { ...resolved, presence: "explicit" }
        : resolved,
      proto
    }
    extensions.set(typeName, out)
    ;(parent ?? file).extensions.push(out)
    let byNumber = extensionsByExtendee.get(extendeeName)
    if (byNumber === undefined) extensionsByExtendee.set(extendeeName, byNumber = new Map())
    if (byNumber.has(resolved.number)) fail(`${typeName}: ${extendeeName} has two extensions ${resolved.number}`)
    byNumber.set(resolved.number, out)
  }

  for (const [service, methods] of pendingMethods) {
    for (const method of service.proto.method ?? []) {
      const at = `${service.typeName}.${method.name}`
      const input = typeRef(method.inputType, at)
      const output = typeRef(method.outputType, at)
      const level = method.options?.idempotencyLevel
      methods.push({
        _tag: "MethodDescriptor",
        name: method.name ?? fail(`${service.typeName}: a method without a name`),
        parent: service,
        input: messages.get(input) ?? fail(`${at}: message ${input} is not defined`),
        output: messages.get(output) ?? fail(`${at}: message ${output} is not defined`),
        clientStreaming: method.clientStreaming === true,
        serverStreaming: method.serverStreaming === true,
        idempotency: level === 1 ? "noSideEffects" : level === 2 ? "idempotent" : "unknown",
        proto: method
      })
    }
  }

  const visible = (name: string) => entries.has(name) ? undefined : messages.get(name)
  return {
    files: [...files.values()],
    getFile: (name) => files.get(name),
    getMessage: visible,
    getEnum: (name) => enums.get(name),
    getService: (name) => services.get(name),
    getExtension: (name) => extensions.get(name),
    findExtension: (extendee, number) => extensionsByExtendee.get(extendee)?.get(number)
  }
}
