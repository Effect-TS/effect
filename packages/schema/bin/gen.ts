#!/usr/bin/env node

import * as Cli from "@effect/cli"
import * as PlatformNode from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Function from "effect/Function"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as String from "effect/String"
import * as AST from "../src/AST.js"
import * as JsonSchema from "../src/JSONSchema.js"

/**
 * Generates TypeScript source code from an AST. This is a recursive function
 * that will traverse all the down to the leaves of the tree. Also, because we
 * are opting to generate effect Schema struct/classes and not typescript
 * interfaces, we can not delcare a something before it is defined in the source
 * code. This can happen easily when you use $ref to reference another definition
 * in your JSON schema. To solve this, we keep track of any JSON schema references
 * as dependencies and then we can sort all the generated schemas later
 */
const AstToTs = (ast: AST.AST): { code: string; dependencies?: Set<string> | undefined } =>
  Function.pipe(
    Match.value(ast),
    // ---------------------------------------------
    // Trivial cases
    // ---------------------------------------------
    Match.whenOr(
      AST.isAnyKeyword,
      AST.isVoidKeyword,
      AST.isNeverKeyword,
      AST.isBigIntKeyword,
      AST.isNumberKeyword,
      AST.isStringKeyword,
      AST.isObjectKeyword,
      AST.isSymbolKeyword,
      AST.isBooleanKeyword,
      AST.isUnknownKeyword,
      AST.isUndefinedKeyword,
      (ast_) => ({ code: `S.${Option.getOrThrow(AST.getTitleAnnotation(ast_))}` })
    ),
    // ---------------------------------------------
    // Non-trivial cases
    // ---------------------------------------------
    Match.when(AST.isTransform, () => ({ code: "transform" })),
    Match.when(AST.isDeclaration, () => ({ code: "declaration" })),
    Match.when(AST.isTemplateLiteral, () => ({ code: "templateLiteral" })),
    Match.when(AST.isEnums, ({ enums: _enums }) => ({ code: "enums" })),
    Match.when(AST.isUniqueSymbol, ({ symbol: _symbol }) => ({ code: "uniqueSymbol" })),
    Match.when(AST.isLiteral, ({ literal }) => {
      if (Predicate.isString(literal)) return { code: `S.literal("${literal}")` }
      else if (Predicate.isBigInt(literal)) return { code: `S.literal(${literal}n)` }
      else return { code: `S.literal(${literal})` }
    }),
    Match.when(AST.isSuspend, () => {
      const identifier = AST.getIdentifierAnnotation(ast).pipe(Option.getOrThrow)
      return { code: `S.suspend(() => ${identifier})`, dependencies: new Set([identifier]) }
    }),
    Match.when(AST.isRefinement, () => {
      if (AST.getTitleAnnotation(ast).pipe(Option.isSome)) {
        return { code: `S.${AST.getTitleAnnotation(ast).pipe(Option.getOrThrow)}` }
      }
      return { code: "S.unknown" }
    }),
    // ---------------------------------------------
    // Recusive cases
    // ---------------------------------------------
    Match.when(
      AST.isUnion,
      (union) => {
        const nested = union.types.map((_) => AstToTs(_))
        return {
          code: `S.union(${nested.map(({ code }) => code).join(", ")})`,
          dependencies: new Set(nested.flatMap(({ dependencies }) => [...(dependencies ?? [])]))
        }
      }
    ),
    Match.when(
      AST.isTuple,
      (tuple) => {
        if (tuple.elements.length > 0) {
          return { "code": "S.tuple()" }
        }
        const nestedRest = Option.getOrThrow(tuple.rest).map((_) => AstToTs(_))
        return {
          code: `S.array(${nestedRest.map(({ code }) => code).join(", ")})`,
          dependencies: new Set(nestedRest.flatMap(({ dependencies }) => [...(dependencies ?? [])]))
        }
      }
    ),
    Match.when(AST.isTypeLiteral, ({ indexSignatures: _indexSignatures, propertySignatures }) => {
      const asts = propertySignatures.map((property) => ({ property, ...AstToTs(property.type) }))

      const allFields = asts.flatMap(({ code, property }) =>
        `/** ${Option.getOrUndefined(AST.getDescriptionAnnotation(property.type))} */\n${
          property.name.toString().includes(".") || property.name.toString().includes("-")
            ? `"${property.name.toString()}"`
            : property.name.toString()
        }: ${code}`
      )

      const a = [...String.linesIterator(allFields.join(",\n"))].map((x) => `${" ".repeat(2)}${x}`).join("\n")

      return {
        code: `S.struct({\n${a}\n})`,
        dependencies: new Set(asts.flatMap(({ dependencies }) => [...(dependencies ?? [])]))
      }
    }),
    Match.exhaustive
  )

export const orderSchemas = (
  sectionsToProcess: Array<{ name: string; code: string; dependencies: Set<string> }>
): Array<{ name: string; code: string; dependencies: Set<string> }> => {
  // We are done when there are no more sections to process
  if (sectionsToProcess.length === 0) return []

  // This iteration, we will add all the sections that have no more dependencies
  const sectionsWithNoDependencies = sectionsToProcess.filter(({ dependencies }) => dependencies.size === 0)
  const newCompletedSections: Set<string> = new Set(sectionsWithNoDependencies.map(({ name }) => name))

  // If there is currently no sections with no dependencies and we
  // know that there are still sections left to process from the
  // guard above, then there must be a circular dependency prevent
  // the dependencies from being ready. Can not be resolved with suspend
  if (sectionsWithNoDependencies.length === 0) {
    throw new Error("Circular dependency detected")
  }

  // Remove all the sections we just added from the dependencies of the remaining sections
  const newSectionsToProcess = sectionsToProcess
    .filter((x) => !sectionsWithNoDependencies.includes(x))
    .map(({ dependencies, ...rest }) => ({
      ...rest,
      dependencies: new Set([...dependencies].filter((dep) => !newCompletedSections.has(dep)))
    }))

  // Recurse with the modified sections
  return [...sectionsWithNoDependencies, ...orderSchemas(newSectionsToProcess)]
}

const command = Cli.Command.make(
  "test",
  { file: Cli.Args.file() },
  ({ file }) =>
    Effect.gen(function*(_: Effect.Adapter) {
      const fs = yield* _(PlatformNode.FileSystem.FileSystem)

      const data = yield* _(fs.readFileString(file))
      const jsonSchema7: JsonSchema.JsonSchema7Root = JSON.parse(data) as unknown as JsonSchema.JsonSchema7Root
      const schemaEntries = Object.entries(JsonSchema.decodeMultiSchema(jsonSchema7)) // .filter(([name]) => name === "GenericResources")

      const schemas = schemaEntries.map(([definitionName, schema]) => ({
        name: definitionName,
        ...AstToTs(schema.ast)
      })).map(({ dependencies, ...rest }) => ({ dependencies: dependencies ?? new Set(), ...rest }))
      const orderedSchemas = orderSchemas(schemas).map((x) =>
        x.code.startsWith("S.struct")
          ? `export class ${x.name} extends S.Class<${x.name}>()${x.code.slice("S.struct".length)} {}`
          : `export const ${x.name} = ${x.code}`
      ).join("\n\n")

      yield* _(fs.writeFileString("./bin/test.ts", "import * as S from \"../src/Schema.js\"\n\n" + orderedSchemas))
    })
)

const cli = Cli.Command.run(command, {
  name: "test",
  version: "v1.0.0"
})

Effect.suspend(() => cli(process.argv.slice(2))).pipe(
  Effect.provide(PlatformNode.NodeContext.layer),
  PlatformNode.Runtime.runMain
)
