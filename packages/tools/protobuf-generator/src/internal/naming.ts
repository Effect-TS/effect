/**
 * Identifiers, property keys, and module paths of generated code.
 */

/**
 * protoc's `ToJsonName`: drops each `_` and upper-cases the letter after it.
 * It derives property keys from field and oneof names, which then match the
 * default `json_name` of the field.
 */
export const protoCamelCase = (name: string): string => {
  let out = ""
  let upper = false
  for (const c of name) {
    if (c === "_") {
      upper = true
    } else if (upper) {
      out += c.toUpperCase()
      upper = false
    } else {
      out += c
    }
  }
  return out
}

/** Names that generated declarations must not shadow. */
const reserved = new Set([
  // namespaces imported by generated code
  "Schema",
  "Protobuf",
  "ProtobufDescriptor",
  "ProtobufPlugin",
  "Rpc",
  "RpcGroup",
  "ConnectRpc",
  // globals used by generated code
  "Array",
  "BigInt",
  "Boolean",
  "Error",
  "Number",
  "Object",
  "Promise",
  "ReadonlyArray",
  "Record",
  "String",
  "Symbol",
  "Uint8Array",
  // reserved words, strict mode reserved words, and global values
  "arguments",
  "await",
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
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "Infinity",
  "instanceof",
  "interface",
  "let",
  "NaN",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  // TypeScript type names
  "any",
  "bigint",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "type",
  "unknown"
])

/** Appends `$` to names that are reserved in generated modules. */
export const safeIdentifier = (name: string): string => reserved.has(name) ? `${name}$` : name

/**
 * A property key in an object literal: quoted unless it is an identifier, and
 * `__proto__` computed so that it is an own property.
 */
export const propertyKey = (key: string): string =>
  key === "__proto__" ? `["__proto__"]` : /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)

/** `acme/v1/user.proto` → `acme/v1/user.proto.ts` */
export const generatedFileName = (protoFile: string): string => protoFile.replace(/\.proto$/, "") + ".proto.ts"

/**
 * The namespace a generated module is imported as: `acme/v1/user.proto` →
 * `acme_v1_user_proto`, and `123/user.proto` → `_123_user_proto`.
 */
export const importAlias = (protoFile: string): string => {
  const alias = protoFile.replace(/\.proto$/, "").replace(/[^A-Za-z0-9_]/g, "_") + "_proto"
  return /^[0-9]/.test(alias) ? `_${alias}` : alias
}

/** A relative import of the module generated for `to` from the module generated for `from`. */
export const relativeImport = (from: string, to: string, extension: "js" | "ts" | "none"): string => {
  const fromDir = from.split("/").slice(0, -1)
  const target = generatedFileName(to).split("/")
  let common = 0
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) common++
  const up = fromDir.length - common
  const path = (up === 0 ? "./" : "../".repeat(up)) + target.slice(common).join("/")
  const base = path.slice(0, -".ts".length)
  return extension === "none" ? base : `${base}.${extension}`
}
