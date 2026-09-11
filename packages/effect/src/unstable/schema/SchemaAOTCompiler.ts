/**
 * Generates static JavaScript modules that install Schema decoders in the shared
 * registry. Generated modules use the same runtime support as the JIT compiler,
 * without importing source generation or constructing functions dynamically.
 *
 * @since 4.0.0
 */
import * as Codegen from "../../internal/schema/codegen.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type { runtime } from "./SchemaCompiler/runtime.ts"

const helper = (name: keyof typeof runtime): string => `R.${name}`

const decoder = (ast: SchemaAST.AST): string | undefined => {
  if (!Codegen.shouldCompileParser(ast)) return undefined
  const operations: ReadonlyArray<Codegen.DecoderOperation> = ["is", "validate", "decodeEffect", "makeEffect"]
  return "{" + operations.flatMap((key) => {
    const source = Codegen.generate(ast, key)
    return source === undefined ? [] : [`get ${key}(){${source}}`]
  }).join(",") + "}"
}

/**
 * Generates a JavaScript ES module exporting `install(asts): void` for an
 * ordered array of ASTs and their statically reachable parsing and construction dependencies.
 *
 * **When to use**
 *
 * Use to prepare decoders at build time for environments that disallow dynamic
 * function construction. Save the returned source as a JavaScript module, then
 * call its `install` export with the corresponding runtime ASTs in the same
 * order before using parsers. Use a one-element array for a single schema.
 *
 * **Details**
 *
 * Generation does not install decoders or execute checks and transformations.
 * Installation uses the same registry as `SchemaCompiler.set`; normal
 * `SchemaParser` functions consume those entries. Generated validators and
 * Struct and homogeneous Array loops are static functions. They share diagnostic and
 * asynchronous continuation helpers with the interpreter. Other detailed
 * traversals and transformation orchestration use the interpreter with
 * registry-resolved children. Transformations and middleware are not replayed.
 * Repeated ASTs and shared dependencies are installed once by identity. Fast
 * paths can still inline dependency code into multiple parent decoders.
 * An empty array generates a module whose installation does nothing.
 * Construction uses independently lazy `makeEffect` operations. Struct and
 * homogeneous Array loops are emitted as static functions; tuple, Record, Union, leaf, and Class
 * constructors use the existing interpreter. Constructor defaults
 * and Class source schemas are read from the supplied ASTs, not serialized or
 * executed during generation. Construction never runs a validation-and-replay pass.
 *
 * **Gotchas**
 *
 * Regenerate the module whenever the schema definition or Effect version
 * changes. Installation trusts that the runtime array has the same length and
 * root order, and its ASTs have the same definitions and sharing as at build
 * time. Functions and symbols are read from those ASTs, not serialized.
 * Suspend thunks are not evaluated during generation; their contents and other
 * unsupported nodes use the interpreter.
 * Installation replaces generated entries, but parsers that already captured
 * older entries keep them. Type-side and flipped ASTs are separate registry
 * keys; generate and install them separately when needed. Importing the
 * generated module alone does not install anything.
 * In particular, include `SchemaAST.toType(schema.ast)` to prepare construction
 * when it differs from the encoded root. Unsupported constructors use the
 * interpreter while statically installed children remain available.
 *
 * @category compilation
 * @since 4.0.0
 */
export const compile = (asts: ReadonlyArray<SchemaAST.AST>): string => {
  const seen = new Map<SchemaAST.AST, string>()
  const bindings: Array<string> = []
  const factories: Array<string> = []
  const installations: Array<string> = []

  const visit = (node: SchemaAST.AST, reference: string): void => {
    if (seen.has(node)) return
    const index = seen.size
    const name = `a${index}`
    seen.set(node, name)
    bindings.push(`const ${name}=${reference};`)

    switch (node._tag) {
      case "Declaration":
        node.typeParameters.forEach((child, index) => visit(child, `${name}.typeParameters[${index}]`))
        break
      case "TemplateLiteral":
        node.parts.forEach((child, index) => visit(child, `${name}.parts[${index}]`))
        break
      case "Arrays":
        node.elements.forEach((child, index) => visit(child, `${name}.elements[${index}]`))
        node.rest.forEach((child, index) => visit(child, `${name}.rest[${index}]`))
        break
      case "Objects":
        node.propertySignatures.forEach((property, index) =>
          visit(property.type, `${name}.propertySignatures[${index}].type`)
        )
        node.indexSignatures.forEach((signature, index) => {
          visit(
            SchemaAST.parameterFromPropertyKey(signature.parameter),
            `${helper("parameterFromPropertyKey")}(${name}.indexSignatures[${index}].parameter)`
          )
          visit(signature.type, `${name}.indexSignatures[${index}].type`)
        })
        break
      case "Union":
        node.types.forEach((child, index) => visit(child, `${name}.types[${index}]`))
        break
    }
    node.encoding?.forEach((link, index) => visit(link.to, `${name}.encoding[${index}].to`))
    if (node.context?.constructorDefault !== undefined) {
      visit(node.context.constructorDefault.to, `${name}.context.constructorDefault.to`)
    }
    const descriptor = SchemaAST.getConstructorDescriptor(node)
    if (descriptor !== undefined) {
      visit(descriptor.link.to, `${helper("getConstructorDescriptor")}(${name}).link.to`)
    }

    const source = decoder(node)
    if (source !== undefined) {
      factories.push(`function d${index}(ast,R,resolve){return ${source}}`)
      installations.push(`${helper("set")}(${name},d${index}(${name},R,R.resolve));`)
    }
  }
  asts.forEach((ast, index) => visit(ast, `asts[${index}]`))
  return [
    "// Generated by SchemaAOTCompiler. Regenerate after schema or Effect changes.",
    "import { runtime as R } from \"effect/unstable/schema/SchemaCompiler/runtime\";",
    ...factories,
    "/** @param {ReadonlyArray<import(\"effect/SchemaAST\").AST>} asts */",
    "export function install(asts){",
    ...bindings,
    ...installations,
    "}",
    ""
  ].join("\n")
}
