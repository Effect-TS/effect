import * as Effect from "../../Effect.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import { effectIsExit } from "../effect.ts"
import type { Parser, ResolveParser } from "./compilerRegistry.ts"
import * as InternalParser from "./parser.ts"
import { applyTransformation, makeEncoding } from "./transformation.ts"

function makeConstructorParser(descriptor: SchemaAST.ConstructorDescriptor, resolve: ResolveParser): Parser {
  let sourceParser: Parser
  return (input, options) => {
    if (input === InternalParser.missing) return InternalParser.missingExit
    if (descriptor.isConstructed(input)) return InternalParser.sameExit
    const result = (sourceParser ??= resolve(descriptor.link.to))(input, options)
    return applyTransformation(result, input, descriptor.link.transformation, options)
  }
}

/** @internal */
export function compile(
  ast: SchemaAST.AST,
  resolve: ResolveParser,
  resolveConstructorDefault?: ResolveParser,
  constructorDefault?: SchemaAST.Link
): Parser {
  const descriptor = resolveConstructorDefault ? SchemaAST.getConstructorDescriptor(ast) : undefined
  const parser = descriptor
    ? makeConstructorParser(descriptor, resolve)
    : ast.getParser(resolve, resolveConstructorDefault)
  const checks = ast.checks
  const links: SchemaAST.Encoding | undefined = constructorDefault
    ? ast.encoding ? [...ast.encoding, constructorDefault] : [constructorDefault]
    : ast.encoding
  const encodingChecks = (ast as any).encodingChecks
  if (!links && !checks && !encodingChecks) {
    return parser
  }
  const parseLocal = (
    input: unknown,
    options: SchemaAST.ParseOptions
  ) => {
    let result = parser(input, options)
    if (encodingChecks && !options.disableChecks) {
      if (effectIsExit(result)) {
        if (result._tag === "Success") {
          const output = result === InternalParser.sameExit
            ? input
            : (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
          if (input !== InternalParser.missing && output !== InternalParser.missing) {
            const issues = SchemaAST.collectIssues(encodingChecks, input, undefined, ast, options)
            if (issues) result = Effect.fail(new SchemaIssue.Composite(ast, issues, input, options))
          }
        }
      } else {
        result = Effect.flatMap(result, (value) => {
          if (input !== InternalParser.missing && value !== InternalParser.missing) {
            const issues = SchemaAST.collectIssues(encodingChecks, input, undefined, ast, options)
            if (issues) return Effect.fail(new SchemaIssue.Composite(ast, issues, input, options))
          }
          return Effect.succeed(value)
        })
      }
    }
    if (checks && !options.disableChecks) {
      if (effectIsExit(result)) {
        if (result._tag === "Success") {
          const value = result === InternalParser.sameExit
            ? input
            : (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
          if (value === InternalParser.missing) return result
          const issues = SchemaAST.collectIssues(checks, value, undefined, ast, options)
          if (issues) result = Effect.fail(new SchemaIssue.Composite(ast, issues, value, options))
        }
      } else {
        result = Effect.flatMap(result, (value) => {
          if (value !== InternalParser.missing) {
            const issues = SchemaAST.collectIssues(checks, value, undefined, ast, options)
            if (issues) return Effect.fail(new SchemaIssue.Composite(ast, issues, value, options))
          }
          return Effect.succeed(value)
        })
      }
    }
    return result
  }
  if (!links) {
    return parseLocal
  }
  let encodingParser: Parser | undefined
  return (input, options) =>
    (encodingParser ??= makeEncoding(ast, links, links.map((link) => resolve(link.to)), parseLocal))(input, options)
}
