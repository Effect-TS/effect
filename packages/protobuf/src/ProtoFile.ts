/**
 * Renders `.proto` source from Effect schemas and `RpcGroup`s, so services
 * defined schema-first can be consumed by other protobuf toolchains.
 *
 * PROTOTYPE — see the package README.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Option from "effect/Option"
import type * as Rpc from "effect/rpc/Rpc"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import * as RpcSchema from "effect/rpc/RpcSchema"
import type * as Schema from "effect/Schema"
import type * as SchemaAST from "effect/SchemaAST"
import { CodeKey, ServiceName } from "./ConnectRpc.ts"
import { getAnnotation, protoCamelCase } from "./internal/annotations.ts"
import * as Layout from "./internal/layout.ts"

/**
 * Options for {@link make}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface Options {
  /** The proto package, for example `"acme.v1"`. */
  readonly package: string
  /** Message schemas to include (structs or classes). */
  readonly messages?: ReadonlyArray<Schema.Top> | undefined
  /** Services to include. Each group needs a `ConnectRpc.ServiceName`. */
  readonly services?: ReadonlyArray<RpcGroup.Any> | undefined
  /** Extra `option` lines, for example `{ go_package: "..." }`. */
  readonly options?: Record<string, string> | undefined
}

const WKT_IMPORTS: Record<string, string> = {
  "google.protobuf.Timestamp": "google/protobuf/timestamp.proto",
  "google.protobuf.Duration": "google/protobuf/duration.proto",
  "google.protobuf.Empty": "google/protobuf/empty.proto",
  "google.protobuf.Any": "google/protobuf/any.proto",
  "google.protobuf.Value": "google/protobuf/struct.proto",
  "google.protobuf.Struct": "google/protobuf/struct.proto",
  "google.protobuf.ListValue": "google/protobuf/struct.proto",
  "google.protobuf.DoubleValue": "google/protobuf/wrappers.proto",
  "google.protobuf.FloatValue": "google/protobuf/wrappers.proto",
  "google.protobuf.Int64Value": "google/protobuf/wrappers.proto",
  "google.protobuf.UInt64Value": "google/protobuf/wrappers.proto",
  "google.protobuf.Int32Value": "google/protobuf/wrappers.proto",
  "google.protobuf.UInt32Value": "google/protobuf/wrappers.proto",
  "google.protobuf.BoolValue": "google/protobuf/wrappers.proto",
  "google.protobuf.StringValue": "google/protobuf/wrappers.proto",
  "google.protobuf.BytesValue": "google/protobuf/wrappers.proto"
}

const pascal = (s: string) => {
  const camel = protoCamelCase(s)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

const screaming = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()

const isIdentifier = (s: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)

interface Named<A> {
  readonly desc: A
  /** Name relative to the package, possibly dotted for nested types. */
  name: string
}

/**
 * Renders a `.proto` file (proto3) for the given messages and services.
 *
 * Messages are named after their `identifier` annotation (which should be the
 * fully-qualified proto name, for example `"acme.v1.User"`); anonymous structs
 * are named after their use site. Rpc payloads and successes that are not
 * messages map to `google.protobuf.Empty` for `Void`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf, ProtoFile } from "@effect/protobuf"
 *
 * const User = Schema.Struct({
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2))
 * }).annotate({ identifier: "acme.v1.User" })
 *
 * ProtoFile.make({ package: "acme.v1", messages: [User] })
 * // syntax = "proto3";
 * //
 * // package acme.v1;
 * //
 * // message User {
 * //   uint64 id = 1;
 * //   string name = 2;
 * // }
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const make = (options: Options): string => {
  const pkg = options.package
  const messages = new Map<Layout.MessageDesc, Named<Layout.MessageDesc>>()
  const enums = new Map<Layout.EnumDesc, Named<Layout.EnumDesc>>()
  const imports = new Set<string>()
  const taken = new Set<string>()
  const descriptions = new Map<Layout.MessageDesc, string>()

  const relative = (typeName: string): string => {
    if (typeName.startsWith(pkg + ".")) return typeName.slice(pkg.length + 1)
    const parts = typeName.split(".")
    return parts[parts.length - 1]
  }

  const claim = (name: string): string => {
    let candidate = name
    for (let i = 2; taken.has(candidate); i++) candidate = `${name}${i}`
    taken.add(candidate)
    return candidate
  }

  const external = (typeName: string | undefined) => typeName !== undefined && typeName in WKT_IMPORTS

  // the same message used at different field positions compiles to distinct
  // descriptors (key annotations copy the AST node), so named types are
  // deduplicated by their type name
  const messagesByTypeName = new Map<string, Named<Layout.MessageDesc>>()
  const enumsByTypeName = new Map<string, Named<Layout.EnumDesc>>()

  const visitMessage = (desc: Layout.MessageDesc, fallbackName: string) => {
    if (messages.has(desc)) return
    if (external(desc.typeName)) {
      imports.add(WKT_IMPORTS[desc.typeName!])
      return
    }
    const existing = desc.typeName !== undefined ? messagesByTypeName.get(desc.typeName) : undefined
    if (existing !== undefined) {
      messages.set(desc, existing)
      return
    }
    const named: Named<Layout.MessageDesc> = {
      desc,
      name: claim(desc.typeName !== undefined ? relative(desc.typeName) : fallbackName)
    }
    messages.set(desc, named)
    if (desc.typeName !== undefined) messagesByTypeName.set(desc.typeName, named)
    const description = desc.ast.annotations?.description
    if (typeof description === "string") descriptions.set(desc, description)
    for (const entry of desc.entries) {
      if (entry._ === "field") {
        visitValue(entry.type, `${named.name.replaceAll(".", "_")}${pascal(entry.name)}`)
      } else {
        for (const c of entry.cases) visitValue(c.type, `${named.name.replaceAll(".", "_")}${pascal(c.name)}`)
      }
    }
  }

  const visitValue = (type: Layout.ValueType, fallbackName: string) => {
    switch (type._) {
      case "message":
        return visitMessage(type.desc, fallbackName)
      case "enum": {
        if (enums.has(type.desc)) return
        const existing = type.desc.typeName !== undefined ? enumsByTypeName.get(type.desc.typeName) : undefined
        if (existing !== undefined) {
          enums.set(type.desc, existing)
          return
        }
        const named = {
          desc: type.desc,
          name: claim(type.desc.typeName !== undefined ? relative(type.desc.typeName) : fallbackName)
        }
        enums.set(type.desc, named)
        if (type.desc.typeName !== undefined) enumsByTypeName.set(type.desc.typeName, named)
        return
      }
      case "wkt":
        imports.add(WKT_IMPORTS[wktTypeName(type.wkt)])
        return
      case "scalar":
        if (type.wrapper) imports.add(WKT_IMPORTS[Layout.wrapperTypeName(type.scalar)])
        return
      case "convert":
        return visitValue(type.inner, fallbackName)
    }
  }

  const visitRoot = (root: Layout.Root, fallbackName: string) => {
    if (root._ === "void") imports.add(WKT_IMPORTS["google.protobuf.Empty"])
    else visitMessage(root.desc, fallbackName)
  }

  for (const schema of options.messages ?? []) {
    const root = Layout.compileRoot(schema.ast)
    visitRoot(root, "Message")
  }

  interface ServiceInfo {
    readonly name: string
    readonly methods: ReadonlyArray<{
      readonly name: string
      readonly input: Layout.Root
      readonly output: Layout.Root
      readonly stream: boolean
      readonly errors: ReadonlyArray<{ readonly root: Layout.Root; readonly code: string | undefined }>
    }>
  }
  const services: Array<ServiceInfo> = []
  for (const group of options.services ?? []) {
    const g = group as RpcGroup.RpcGroup<any>
    const serviceName = Option.getOrUndefined(Context.getOption(g.annotations, ServiceName))
    if (serviceName === undefined) throw new Error("ProtoFile: the RpcGroup needs a ConnectRpc.ServiceName annotation")
    const methods: Array<ServiceInfo["methods"][number]> = []
    for (const rpc of g.requests.values() as Iterable<Rpc.AnyWithProps>) {
      const stream = RpcSchema.isStreamSchema(rpc.successSchema)
      const success = RpcSchema.isStreamSchema(rpc.successSchema) ? rpc.successSchema.success : rpc.successSchema
      const input = Layout.compileRoot(rpc.payloadSchema.ast)
      const output = Layout.compileRoot(success.ast)
      visitRoot(input, `${rpc._tag}Request`)
      visitRoot(output, `${rpc._tag}Response`)
      const errorSchemas: Array<SchemaAST.AST> = []
      const collect = (s: Schema.Top) => {
        if (s.ast._tag === "Union") errorSchemas.push(...s.ast.types)
        else if (s.ast._tag !== "Never") errorSchemas.push(s.ast)
      }
      collect(rpc.errorSchema)
      if (RpcSchema.isStreamSchema(rpc.successSchema)) collect(rpc.successSchema.error)
      const errors: Array<ServiceInfo["methods"][number]["errors"][number]> = []
      for (const ast of errorSchemas) {
        try {
          const root = Layout.compileRoot(ast)
          visitRoot(root, `${rpc._tag}Error`)
          errors.push({ root, code: getAnnotation<string>(ast, CodeKey) })
        } catch {
          // errors that are not messages travel without details
        }
      }
      methods.push({ name: rpc._tag, input, output, stream, errors })
    }
    services.push({ name: relative(serviceName), methods })
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  const typeRef = (type: Layout.ValueType): string => {
    switch (type._) {
      case "scalar":
        return type.wrapper ? Layout.wrapperTypeName(type.scalar) : type.scalar
      case "enum":
        return enums.get(type.desc)!.name
      case "message":
        return messageRef(type.desc)
      case "wkt":
        return wktTypeName(type.wkt)
      case "convert":
        return typeRef(type.inner)
    }
  }

  const messageRef = (desc: Layout.MessageDesc): string =>
    external(desc.typeName) ? desc.typeName! : messages.get(desc)!.name

  const rootRef = (root: Layout.Root) => root._ === "void" ? "google.protobuf.Empty" : messageRef(root.desc)

  const fieldOptions = (entry: { readonly name: string; readonly jsonName: string }, packed?: boolean) => {
    const opts: Array<string> = []
    if (packed === false) opts.push("packed = false")
    if (entry.jsonName !== protoCamelCase(entry.name)) opts.push(`json_name = "${entry.jsonName}"`)
    return opts.length > 0 ? ` [${opts.join(", ")}]` : ""
  }

  const renderEnum = (named: Named<Layout.EnumDesc>, indent: string): Array<string> => {
    const shortName = named.name.split(".").pop()!
    const lines = [`${indent}enum ${shortName} {`]
    if (!named.desc.byNumber.has(0)) lines.push(`${indent}  ${screaming(shortName)}_UNSPECIFIED = 0;`)
    for (const v of [...named.desc.values].sort((a, b) => a.number - b.number)) {
      const name = isIdentifier(v.name) ? v.name : screaming(v.name)
      lines.push(`${indent}  ${name} = ${v.number};${name !== v.name ? ` // ${JSON.stringify(v.name)}` : ""}`)
    }
    lines.push(`${indent}}`)
    return lines
  }

  const renderField = (entry: Layout.FieldEntry, indent: string): string => {
    const t = typeRef(entry.type)
    switch (entry.card) {
      case "repeated":
        return `${indent}repeated ${t} ${entry.name} = ${entry.number}${
          fieldOptions(entry, entry.packed || !Layout.isPackable(entry.type) ? undefined : false)
        };`
      case "map":
        return `${indent}map<${entry.mapKey}, ${t}> ${entry.name} = ${entry.number}${fieldOptions(entry)};`
      case "singular": {
        const explicit = entry.absent !== "zero" && entry.absent !== "required" &&
          (entry.type._ === "scalar" && !entry.type.wrapper || entry.type._ === "enum")
        return `${indent}${explicit ? "optional " : ""}${t} ${entry.name} = ${entry.number}${fieldOptions(entry)};`
      }
    }
  }

  // nest messages and enums whose relative names are dotted under their parent
  const children = new Map<string, Array<{ readonly kind: "message" | "enum"; readonly name: string }>>()
  const topLevel: Array<{ readonly kind: "message" | "enum"; readonly name: string }> = []
  const uniqueMessages = [...new Set(messages.values())]
  const uniqueEnums = [...new Set(enums.values())]
  const allNames = new Set(uniqueMessages.map((m) => m.name))
  for (
    const [kind, named] of [
      ...uniqueMessages.map((m) => ["message", m] as const),
      ...uniqueEnums.map((e) => ["enum", e] as const)
    ]
  ) {
    const idx = named.name.lastIndexOf(".")
    const parent = idx === -1 ? undefined : named.name.slice(0, idx)
    if (parent !== undefined && allNames.has(parent)) {
      const list = children.get(parent) ?? []
      list.push({ kind, name: named.name })
      children.set(parent, list)
    } else {
      if (parent !== undefined) named.name = named.name.replaceAll(".", "_")
      topLevel.push({ kind, name: named.name })
    }
  }
  const byName = new Map(uniqueMessages.map((m) => [m.name, m]))
  const enumsByName = new Map(uniqueEnums.map((e) => [e.name, e]))

  const renderMessage = (named: Named<Layout.MessageDesc>, indent: string): Array<string> => {
    const lines: Array<string> = []
    const description = descriptions.get(named.desc)
    if (description !== undefined) { for (const line of description.split("\n")) lines.push(`${indent}// ${line}`) }
    lines.push(`${indent}message ${named.name.split(".").pop()} {`)
    for (const child of children.get(named.name) ?? []) {
      lines.push(
        ...(child.kind === "message"
          ? renderMessage(byName.get(child.name)!, indent + "  ")
          : renderEnum(enumsByName.get(child.name)!, indent + "  ")),
        ""
      )
    }
    for (const [key, literal] of named.desc.literals) {
      lines.push(`${indent}  // constant: ${key} = ${JSON.stringify(literal)}`)
    }
    for (const entry of named.desc.entries) {
      if (entry._ === "field") {
        lines.push(renderField(entry, indent + "  "))
      } else {
        lines.push(`${indent}  oneof ${entry.name} {`)
        for (const c of entry.cases) {
          lines.push(`${indent}    ${typeRef(c.type)} ${c.name} = ${c.number}${fieldOptions(c)};`)
        }
        lines.push(`${indent}  }`)
      }
    }
    if (lines[lines.length - 1] === "") lines.pop()
    lines.push(`${indent}}`)
    return lines
  }

  const out: Array<string> = [`syntax = "proto3";`, "", `package ${pkg};`]
  if (imports.size > 0) {
    out.push("")
    for (const i of [...imports].sort()) out.push(`import "${i}";`)
  }
  if (options.options !== undefined) {
    out.push("")
    for (const [k, v] of Object.entries(options.options)) out.push(`option ${k} = ${JSON.stringify(v)};`)
  }
  for (const item of topLevel) {
    out.push("")
    out.push(
      ...(item.kind === "message"
        ? renderMessage(byName.get(item.name)!, "")
        : renderEnum(enumsByName.get(item.name)!, ""))
    )
  }
  for (const service of services) {
    out.push("", `service ${service.name} {`)
    for (const m of service.methods) {
      for (const e of m.errors) {
        out.push(`  // error: ${rootRef(e.root)}${e.code !== undefined ? ` (${e.code})` : ""}`)
      }
      out.push(`  rpc ${m.name}(${rootRef(m.input)}) returns (${m.stream ? "stream " : ""}${rootRef(m.output)});`)
    }
    out.push("}")
  }
  return out.join("\n") + "\n"
}

const wktTypeName = (wkt: Layout.WktKind): string => {
  switch (wkt) {
    case "timestamp":
    case "timestampDate":
      return "google.protobuf.Timestamp"
    case "duration":
      return "google.protobuf.Duration"
    case "value":
      return "google.protobuf.Value"
    case "struct":
      return "google.protobuf.Struct"
    case "listValue":
      return "google.protobuf.ListValue"
  }
}
