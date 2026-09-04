import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import type * as Exit from "../../Exit.ts"
import type * as Option from "../../Option.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import { effectIsExit } from "../effect.ts"
import type { Parser, ResolveParser } from "./compilerRegistry.ts"
import * as InternalParser from "./parser.ts"

const mergeParseOptions = (
  options: SchemaAST.ParseOptions,
  overrideOptions: SchemaAST.ParseOptions | undefined
): SchemaAST.ParseOptions => overrideOptions ? { ...options, ...overrideOptions } : options

function applyTransformation(
  result: Effect.Effect<unknown, SchemaIssue.Issue, unknown>,
  current: unknown,
  transformation: SchemaAST.Link["transformation"],
  options: SchemaAST.ParseOptions
): Effect.Effect<unknown, SchemaIssue.Issue, unknown> {
  let transformed: Effect.Effect<Option.Option<unknown>, SchemaIssue.Issue, unknown>
  if (effectIsExit(result) && result._tag === "Success") {
    const optional = InternalParser.toOption(
      result === InternalParser.sameExit
        ? current
        : (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
    )
    transformed = transformation._tag === "Transformation"
      ? transformation.decode.run(optional, options)
      : transformation.decode(InternalParser.succeed(optional), options)
  } else if (transformation._tag === "Transformation") {
    transformed = Effect.flatMapEager(
      result,
      (value) => transformation.decode.run(InternalParser.toOption(value), options)
    )
  } else {
    transformed = transformation.decode(
      Effect.mapEager(result, InternalParser.toOption),
      options
    )
  }
  return effectIsExit(transformed) && transformed._tag === "Success"
    ? InternalParser.fromOptionExit(
      (transformed as InternalParser.Success<Option.Option<unknown>, SchemaIssue.Issue>)[InternalParser.args]
    )
    : Effect.flatMapEager(transformed, InternalParser.fromOptionExit)
}

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
  const links = constructorDefault
    ? ast.encoding ? [...ast.encoding, constructorDefault] : [constructorDefault]
    : ast.encoding
  const encodingChecks = (ast as any).encodingChecks
  const astOptions = (checks ? checks[checks.length - 1].annotations : ast.annotations)
    ?.["parseOptions"]
  if (!links && !checks && !encodingChecks) {
    if (!astOptions) return parser
    return (input, options) => parser(input, mergeParseOptions(options, astOptions))
  }
  let encodingParsers: ReadonlyArray<Parser> | undefined
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
    return astOptions
      ? (input, options) => parseLocal(input, mergeParseOptions(options, astOptions))
      : parseLocal
  }
  return (
    input: unknown,
    options: SchemaAST.ParseOptions
  ) => {
    if (astOptions) options = mergeParseOptions(options, astOptions)
    const parsers = encodingParsers ??= links.map((link) => resolve(link.to))
    let current = input
    let result = parsers[parsers.length - 1](input, options)
    for (let i = links.length - 1; i >= 0; i--) {
      result = applyTransformation(result, current, links[i].transformation, options)
      if (i !== 0) {
        const next = parsers[i - 1]
        if ((result as Exit.Exit<unknown, unknown>)._tag === "Success") {
          current = (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
          result = next(current, options)
        } else {
          result = Effect.flatMapEager(result, (value) => {
            const nextResult = next(value, options)
            return nextResult === InternalParser.sameExit ? InternalParser.succeed(value) : nextResult
          })
        }
      }
    }
    if ((result as Exit.Exit<unknown, unknown>)._tag === "Success") {
      const value = (result as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
      const local = parseLocal(value, options)
      return local === InternalParser.sameExit ? result : local
    }
    result = Effect.catchCause(
      result,
      (cause) =>
        Effect.failCauseSync(() =>
          Cause.map(
            cause,
            (issue) => new SchemaIssue.Encoding(ast, issue, input, options)
          )
        )
    )
    return Effect.flatMapEager(result, (value) => {
      const local = parseLocal(value, options)
      return local === InternalParser.sameExit ? InternalParser.succeed(value) : local
    })
  }
}
