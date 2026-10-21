import * as JsonPointer from "effect/JsonPointer"
import type * as JsonSchema from "effect/JsonSchema"
import * as Predicate from "effect/Predicate"
import { SaxesParser } from "saxes"
import ts from "typescript-compiler"

/** @internal */
export interface Model extends JsonSchema.JsonSchema {
  type?: string | Array<string>
  properties?: Record<string, Model>
  required?: Array<string>
  items?: Model
  anyOf?: Array<Model>
  oneOf?: Array<Model>
  allOf?: Array<Model>
}

/** @internal */
export function record(value: unknown, location: string): Record<string, unknown> {
  if (!Predicate.isObject(value)) throw new Error(`Expected an object at ${location}`)
  return value
}

/** @internal */
export function select(value: unknown, path: ReadonlyArray<string>): unknown {
  for (const key of path) {
    const parent = record(value, path.join("/"))
    if (!Object.hasOwn(parent, key)) throw new Error(`Missing schema path: ${path.join("/")}`)
    value = parent[key]
  }
  return value
}

// Resolve only references within the verified document. Unpinned remote references fail closed.
/** @internal */
export function openApi(document: unknown, path: ReadonlyArray<string>, sourceUrl: string): Model {
  const visiting = new Set<string>()
  const resolve = (value: unknown): Model => {
    const input = record(value, path.join("/"))
    if (typeof input.$ref === "string") {
      for (const key of Object.keys(input)) {
        if (
          !["$ref", "description", "summary", "title", "example", "examples", "deprecated", "externalDocs"].includes(
            key
          )
        ) {
          throw new Error(`Unsupported schema reference sibling: ${key}`)
        }
      }
      const reference = new URL(input.$ref, sourceUrl)
      const pointer = reference.hash
      const tokens = JsonPointer.parseUriFragment(pointer)
      reference.hash = ""
      if (reference.href !== sourceUrl || tokens === undefined || tokens.length === 0) {
        throw new Error(`Unpinned schema reference: ${input.$ref}`)
      }
      if (visiting.has(pointer)) throw new Error(`Recursive profile reference: ${pointer}`)
      visiting.add(pointer)
      const resolved = resolve(select(document, tokens))
      visiting.delete(pointer)
      return resolved
    }
    const result: Model = { ...input }
    if (input.properties !== undefined) {
      result.type ??= "object"
      result.properties = Object.fromEntries(
        Object.entries(record(input.properties, "properties")).map(([name, field]) => [name, resolve(field)])
      )
    }
    if (input.items !== undefined) result.items = resolve(input.items)
    if (typeof input.additionalProperties === "object" && input.additionalProperties !== null) {
      result.additionalProperties = resolve(input.additionalProperties)
    }
    for (const keyword of ["anyOf", "oneOf", "allOf"] as const) {
      if (input[keyword] === undefined) continue
      if (!Array.isArray(input[keyword])) throw new Error(`Expected an array at ${keyword}`)
      result[keyword] = input[keyword].map(resolve)
    }
    let output = result
    if (result.allOf !== undefined) {
      const parts = result.allOf
      delete result.allOf
      output = mergeObjects([result, ...parts])
    }
    if (input.nullable === true) {
      delete output.nullable
      return { anyOf: [output, { type: "null" }] }
    }
    return output
  }
  return resolve(select(document, path))
}

function mergeObjects(parts: ReadonlyArray<Model>): Model {
  const properties: Record<string, Model> = Object.create(null)
  const required = new Set<string>()
  let additionalProperties: unknown
  for (const part of parts) {
    if (
      (part.type !== undefined && part.type !== "object") || part.anyOf !== undefined || part.oneOf !== undefined ||
      part.not !== undefined
    ) {
      throw new Error("Expected an object intersection")
    }
    for (const [name, field] of Object.entries(part.properties ?? {})) {
      if (Object.hasOwn(properties, name) && JSON.stringify(properties[name]) !== JSON.stringify(field)) {
        throw new Error(`Conflicting intersection field: ${name}`)
      }
      properties[name] = field
    }
    for (const name of part.required ?? []) required.add(name)
    if (part.additionalProperties !== undefined) {
      if (
        additionalProperties !== undefined &&
        JSON.stringify(additionalProperties) !== JSON.stringify(part.additionalProperties)
      ) {
        throw new Error("Conflicting intersection index signatures")
      }
      additionalProperties = part.additionalProperties
    }
  }
  return {
    type: "object",
    properties: { ...properties },
    required: [...required],
    ...(additionalProperties === undefined ? {} : { additionalProperties })
  }
}

/** @internal */
export function openId(source: string): Model {
  const table = /<texttable\b[^>]*\banchor="ClaimTable"[^>]*>[\s\S]*?<\/texttable>/u.exec(source)?.[0]
  const address = /<section\b[^>]*\banchor="AddressClaim"[^>]*>[\s\S]*?<\/section>/u.exec(source)?.[0]
  if (table === undefined || address === undefined) throw new Error("Missing OpenID claim definitions")
  const cells: Array<string> = []
  const addressFields: Record<string, Model> = Object.create(null)
  let depth = 0
  let cellDepth = -1
  let text = ""
  const parser = new SaxesParser({ fragment: true })
  parser.on("opentag", (tag) => {
    depth++
    if (tag.name === "c") {
      cellDepth = depth
      text = ""
    }
    if (tag.name === "t" && typeof tag.attributes.hangText === "string") {
      addressFields[tag.attributes.hangText] = { type: "string" }
    }
  })
  parser.on("text", (value) => {
    if (cellDepth >= 0) text += value
  })
  parser.on("closetag", () => {
    if (depth === cellDepth) {
      cells.push(text.trim())
      cellDepth = -1
    }
    depth--
  })
  parser.write(table + address).close()
  if (cells.length === 0 || cells.length % 3 !== 0 || Object.keys(addressFields).length === 0) {
    throw new Error("Invalid OpenID claim definitions")
  }
  const properties: Record<string, Model> = Object.create(null)
  for (let index = 0; index < cells.length; index += 3) {
    const name = cells[index]
    const type = cells[index + 1]
    if (type === "JSON object" && name === "address") {
      properties[name] = { type: "object", properties: { ...addressFields } }
    } else if (type === "string" || type === "boolean" || type === "number") {
      properties[name] = { type }
    } else {
      throw new Error(`Unsupported OpenID claim type: ${name}: ${type}`)
    }
  }
  return { type: "object", properties: { ...properties } }
}

interface Declaration {
  readonly node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  readonly file: string
  readonly namespace: string
}

/** @internal */
export function typescript(sources: Readonly<Record<string, string>>) {
  const declarations = new Map<string, Declaration>()
  const imports = new Map<string, { readonly file: string; readonly name: string }>()
  for (const [file, contents] of Object.entries(sources)) {
    const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true)
    const visit = (nodes: ReadonlyArray<ts.Node>, namespace: string) => {
      for (const node of nodes) {
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
          declarations.set(`${file}:${namespace}${node.name.text}`, { node, file, namespace })
        } else if (ts.isModuleDeclaration(node) && node.body !== undefined && ts.isModuleBlock(node.body)) {
          visit(node.body.statements, `${namespace}${node.name.text}.`)
        } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const bindings = node.importClause?.namedBindings
          if (bindings !== undefined && ts.isNamedImports(bindings)) {
            const target = new URL(node.moduleSpecifier.text, `file://${file}`).pathname.replace(/\.(?:js|ts)$/u, "") +
              ".ts"
            for (const binding of bindings.elements) {
              imports.set(`${file}:${binding.name.text}`, {
                file: target,
                name: (binding.propertyName ?? binding.name).text
              })
            }
          }
        }
      }
    }
    visit(source.statements, "")
  }
  const visiting = new Set<string>()
  const declaration = (name: string, context: { readonly file: string; readonly namespace: string }): Declaration => {
    let namespace = context.namespace
    while (true) {
      const found = declarations.get(`${context.file}:${namespace}${name}`)
      if (found !== undefined) return found
      if (namespace === "") break
      const parent = namespace.slice(0, -1)
      namespace = parent.slice(0, parent.lastIndexOf(".") + 1)
    }
    const imported = imports.get(`${context.file}:${name}`)
    if (imported !== undefined) return declaration(imported.name, { ...imported, namespace: "" })
    throw new Error(`Unresolved upstream type: ${context.file}:${name}`)
  }
  const members = (nodes: ReadonlyArray<ts.TypeElement>, context: Declaration): Model => {
    const properties: Record<string, Model> = Object.create(null)
    const required: Array<string> = []
    let additionalProperties: Model | undefined
    for (const node of nodes) {
      if (ts.isIndexSignatureDeclaration(node)) {
        additionalProperties = convert(node.type, context)
      } else if (
        ts.isPropertySignature(node) && node.type !== undefined &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
      ) {
        properties[node.name.text] = convert(node.type, context)
        if (node.questionToken === undefined) required.push(node.name.text)
      } else {
        throw new Error(`Unsupported upstream member: ${node.getText()}`)
      }
    }
    return {
      type: "object",
      properties: { ...properties },
      required,
      ...(additionalProperties === undefined ? {} : { additionalProperties })
    }
  }
  const read = (context: Declaration): Model => {
    const key = `${context.file}:${context.namespace}${context.node.name.text}`
    if (visiting.has(key)) throw new Error(`Recursive upstream profile: ${key}`)
    visiting.add(key)
    try {
      const node = context.node
      return ts.isTypeAliasDeclaration(node) ? convert(node.type, context) : mergeObjects([
        ...(node.heritageClauses ?? []).flatMap((clause) =>
          clause.types.map((type) => read(declaration(type.expression.getText(), context)))
        ),
        members(node.members, context)
      ])
    } finally {
      visiting.delete(key)
    }
  }
  const convert = (node: ts.TypeNode, context: Declaration): Model => {
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { type: "string" }
      case ts.SyntaxKind.NumberKeyword:
        return { type: "number" }
      case ts.SyntaxKind.BooleanKeyword:
        return { type: "boolean" }
      case ts.SyntaxKind.NeverKeyword:
        return { not: {} }
      case ts.SyntaxKind.UnknownKeyword:
      case ts.SyntaxKind.AnyKeyword:
        return {}
    }
    if (ts.isLiteralTypeNode(node)) {
      if (node.literal.kind === ts.SyntaxKind.NullKeyword) return { type: "null" }
      if (ts.isStringLiteral(node.literal)) return { type: "string", const: node.literal.text }
      if (ts.isNumericLiteral(node.literal)) return { type: "number", const: Number(node.literal.text) }
      if (node.literal.kind === ts.SyntaxKind.TrueKeyword || node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return { type: "boolean", const: node.literal.kind === ts.SyntaxKind.TrueKeyword }
      }
    }
    if (ts.isArrayTypeNode(node)) return { type: "array", items: convert(node.elementType, context) }
    if (ts.isTypeLiteralNode(node)) return members(node.members, context)
    if (ts.isParenthesizedTypeNode(node)) return convert(node.type, context)
    if (ts.isUnionTypeNode(node)) return { anyOf: node.types.map((type) => convert(type, context)) }
    if (ts.isIntersectionTypeNode(node)) return mergeObjects(node.types.map((type) => convert(type, context)))
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText()
      if ((name === "Array" || name === "ReadonlyArray") && node.typeArguments?.length === 1) {
        return { type: "array", items: convert(node.typeArguments[0], context) }
      }
      if (
        name === "Record" && node.typeArguments?.length === 2 &&
        node.typeArguments[0].kind === ts.SyntaxKind.StringKeyword
      ) {
        return { type: "object", additionalProperties: convert(node.typeArguments[1], context) }
      }
      if (node.typeArguments !== undefined) throw new Error(`Unsupported upstream generic: ${node.getText()}`)
      return read(declaration(name, context))
    }
    throw new Error(`Unsupported upstream type: ${node.getText()}`)
  }
  return (file: string, name: string): Model => read(declaration(name, { file, namespace: "" }))
}
