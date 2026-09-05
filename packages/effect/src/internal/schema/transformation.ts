import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import type * as Exit from "../../Exit.ts"
import type * as Option from "../../Option.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import { effectIsExit } from "../effect.ts"
import type { Parser } from "./compilerRegistry.ts"
import * as InternalParser from "./parser.ts"

/** @internal */
export function applyTransformation(
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

/** @internal */
export const makeEncoding = (
  ast: SchemaAST.AST,
  links: SchemaAST.Encoding,
  parsers: ReadonlyArray<Parser>,
  local: Parser
): Parser =>
(input, options) => {
  let current = input
  let result = parsers[parsers.length - 1](input, options)
  for (let index = links.length - 1; index >= 0; index--) {
    result = applyTransformation(result, current, links[index].transformation, options)
    if (index !== 0) {
      const next = parsers[index - 1]
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
    const decoded = local(value, options)
    return decoded === InternalParser.sameExit ? result : decoded
  }
  result = Effect.catchCause(
    result,
    (cause) =>
      Effect.failCauseSync(() => Cause.map(cause, (issue) => new SchemaIssue.Encoding(ast, issue, input, options)))
  )
  return Effect.flatMapEager(result, (value) => {
    const decoded = local(value, options)
    return decoded === InternalParser.sameExit ? InternalParser.succeed(value) : decoded
  })
}
