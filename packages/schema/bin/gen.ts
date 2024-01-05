#!/usr/bin/env node

import * as Cli from "@effect/cli"
import * as PlatformNode from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Function from "effect/Function"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
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
const AstToTs = (ast: AST.AST): readonly [thisLevel: string, dependencies: Set<string>] =>
  Function.pipe(
    Match.value(ast),
    // These translate directly
    Match.whenOr(
      AST.isAnyKeyword,
      AST.isNeverKeyword,
      AST.isBigIntKeyword,
      AST.isNumberKeyword,
      AST.isStringKeyword,
      AST.isObjectKeyword,
      AST.isSymbolKeyword,
      AST.isBooleanKeyword,
      AST.isUnknownKeyword,
      (ast_) => [`S.${Option.getOrThrow(AST.getTitleAnnotation(ast_))}`, new Set<string>()] as const
    ),
    Match.when(
      AST.isUnion,
      // (union) => [`S.union(${union.types.map(AstToTs).join(", ")})`, new Set<string>()] as const
      () => ["S.unknown", new Set<string>()] as const
    ),
    // This really just does arrays right now.
    // TODO: I think I should be handling the tuple.elements somehow?
    Match.when(
      AST.isTuple,
      (tuple) => {
        if (tuple.elements.length > 0) {
          throw new Error("Tuples are not supported")
        }
        const a = Option.getOrThrow(tuple.rest).map(AstToTs).map((x) => ({ code: x[0], deps: x[1] }))
        const nestedCode = a.map((x) => x.code).join(", ")
        const nestedDependencies = new Set(...a.map((x) => x.deps))
        return [`S.array(${nestedCode})`, nestedDependencies] as const
      }
    ),
    // FIXME: How should this be hadnled?
    Match.whenOr(
      AST.isVoidKeyword,
      AST.isUndefinedKeyword,
      () => {
        throw new Error("void and undefined are not supported")
      }
    ),
    // Literals could be references to other schemas, in which case we need to add them as a dependency
    Match.when(AST.isLiteral, ({ literal }) => {
      const isRef = literal !== null && literal.toString().startsWith(JsonSchema.DEFINITION_PREFIX)
      return isRef
        ? [
          `${literal.toString().replace(JsonSchema.DEFINITION_PREFIX, "")}`,
          new Set<string>([literal.toString().replace(JsonSchema.DEFINITION_PREFIX, "")])
        ] as const
        : [
          `S.literal(${literal})`,
          new Set<string>()
        ] as const
    }),
    Match.when(AST.isEnums, () => ["enums", new Set<string>()] as const),
    Match.when(AST.isSuspend, () => ["suspend", new Set<string>()] as const),
    Match.when(AST.isTransform, () => ["transform", new Set<string>()] as const),
    Match.when(AST.isRefinement, () => ["refinement", new Set<string>()] as const),
    Match.when(AST.isDeclaration, () => ["declaration", new Set<string>()] as const),
    Match.when(AST.isUniqueSymbol, () => ["uniqueSymbol", new Set<string>()] as const),
    Match.when(AST.isTemplateLiteral, () => ["templateLiteral", new Set<string>()] as const),
    // This is the recursive case where we need to combine the dependencies and hoisted values from the children
    Match.when(AST.isTypeLiteral, (ast_) => {
      const asts = ast_.propertySignatures.map((property) => [property, ...AstToTs(property.type)] as const)

      const allDependencies = new Set(asts.flatMap((x) => [...x[2]]))
      const allFields = asts.flatMap(([property, code]) =>
        `/** ${Option.getOrUndefined(AST.getDescriptionAnnotation(property.type))} */\n${
          property.name.toString().includes(".") || property.name.toString().includes("-")
            ? `"${property.name.toString()}"`
            : property.name.toString()
        }: ${code}`
      )

      return [`S.struct({\n${allFields.join(",\n")}\n})`, allDependencies] as const
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
      const asts = Object.entries(jsonSchema7.$defs!).map(([key, value]) => [key, JsonSchema.decode(value)] as const)

      const test = asts.map(([definitionName, ast]) => [definitionName, AstToTs(ast.ast)] as const).map((
        [definitionName, [code, dependencies]]
      ) => ({ name: definitionName, code, dependencies }))
      const test2 = orderSchemas(test).map((x) => `export const ${x.name} = ${x.code}`).join("\n\n")

      yield* _(fs.writeFileString("./bin/test.ts", "import * as S from \"../src/Schema.js\"\n\n" + test2))
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
