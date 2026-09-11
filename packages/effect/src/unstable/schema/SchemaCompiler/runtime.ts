/**
 * Runtime helpers used by generated schema modules. This module contains no
 * source generator or dynamic function construction. Generated modules must
 * use the same Effect version as their generator.
 *
 * @since 4.0.0
 */
import * as Effect from "../../../Effect.ts"
import { effectIsExit } from "../../../internal/effect.ts"
import { lazyParser, type Resolve, resolve, set, withValidation } from "../../../internal/schema/compilerRegistry.ts"
import * as Interpreter from "../../../internal/schema/interpreter.ts"
import * as InternalParser from "../../../internal/schema/parser.ts"
import * as SchemaAST from "../../../SchemaAST.ts"
import * as SchemaIssue from "../../../SchemaIssue.ts"
import { invalid, type Validate } from "../SchemaCompiler.ts"

type GenerateObject = (context: SchemaAST.ObjectParserContext) => SchemaIssueParser
type GenerateArray = NonNullable<Parameters<SchemaAST.Arrays["getParser"]>[2]>
type SchemaIssueParser = ReturnType<typeof Interpreter.compile>

const decode = (
  ast: SchemaAST.AST,
  resolve: Resolve,
  generate?: GenerateObject,
  detailed = false,
  makeValidate?: () => Validate,
  generateArray?: GenerateArray
): SchemaIssueParser => {
  const child = (ast: SchemaAST.AST) => lazyParser(resolve, ast, detailed ? "decodeEffect" : "parser")
  const localChild = makeValidate === undefined
    ? child
    : (ast: SchemaAST.AST) => lazyParser(resolve, ast, "decodeEffect")
  const base = ast._tag === "Objects" && generate !== undefined ?
    ast.getParser(localChild, undefined, generate)
    : ast._tag === "Arrays" && generateArray !== undefined
    ? ast.getParser(localChild, undefined, generateArray)
    : makeValidate !== undefined
    ? ast.getParser(localChild)
    : undefined
  const specialize = makeValidate === undefined ? undefined : (local: SchemaIssueParser): SchemaIssueParser => {
    try {
      return withValidation(makeValidate(), () => local)
    } catch {
      // Initialization failure selects the local interpreter, without parsing again.
      return local
    }
  }
  return Interpreter.compile(ast, child, undefined, base, specialize)
}

const make = (
  ast: SchemaAST.AST,
  resolve: Resolve,
  generate?: GenerateObject,
  generateArray?: GenerateArray
): SchemaIssueParser => {
  const child = (ast: SchemaAST.AST) => lazyParser(resolve, ast, "makeEffect")
  const field = (ast: SchemaAST.AST) => lazyParser(resolve, ast, "makeDefaulted")
  const base = generate !== undefined && ast._tag === "Objects" ?
    ast.getParser(child, field, generate)
    : generateArray !== undefined && ast._tag === "Arrays"
    ? ast.getParser(child, field, generateArray)
    : undefined
  return Interpreter.compile(ast, child, field, base)
}

const failsChecks = (
  ast: SchemaAST.AST,
  value: unknown,
  encoded: boolean,
  options: SchemaAST.ParseOptions
): boolean => {
  const checks = encoded ? "encodingChecks" in ast ? ast.encodingChecks : undefined : ast.checks
  return !options.disableChecks && checks !== undefined &&
    SchemaAST.collectIssues(checks, value, undefined, ast, options) !== undefined
}

const hasExcessProperties = (
  ast: SchemaAST.Objects,
  input: Record<PropertyKey, unknown>,
  options: SchemaAST.ParseOptions
): boolean => {
  const covered = new Set<PropertyKey>(
    ast.propertySignatures.map((p) => typeof p.name === "number" ? String(p.name) : p.name)
  )
  for (const index of ast.indexSignatures) {
    for (const key of SchemaAST.getIndexSignatureKeys(input, index.parameter, options)) covered.add(key)
  }
  return Reflect.ownKeys(input).some((key) => !covered.has(key))
}

/** @internal */
export const runtime = {
  decode,
  make,
  resolve,
  set,
  invalid,
  missing: InternalParser.missing,
  missingExit: InternalParser.missingExit,
  sameExit: InternalParser.sameExit,
  args: InternalParser.args,
  succeed: InternalParser.succeed,
  effectIsExit,
  die: Effect.die,
  invalidType: (ast: SchemaAST.AST, input: unknown, options: SchemaAST.ParseOptions) =>
    Effect.fail(new SchemaIssue.InvalidType(ast, input, options)),
  failsChecks,
  getExpectedKeys: (ast: SchemaAST.Objects) =>
    ast.propertySignatures.map((p) => typeof p.name === "number" ? String(p.name) : p.name),
  hasExcessProperties,
  matchesTemplateLiteral: (ast: SchemaAST.TemplateLiteral, input: unknown, options: SchemaAST.ParseOptions) =>
    typeof input === "string" && ast.matchPart(input, options) !== undefined,
  getCandidates: SchemaAST.getCandidates,
  getIndexSignatureKeys: SchemaAST.getIndexSignatureKeys,
  parameterFromPropertyKey: SchemaAST.parameterFromPropertyKey,
  getConstructorDescriptor: SchemaAST.getConstructorDescriptor,
  defaultParseOptions: SchemaAST.defaultParseOptions
}
