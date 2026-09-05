import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import { iterateEager } from "../effect.ts"
import { assignProperty } from "../record.ts"
import { wrapPropertyKeyIssue } from "./cause.ts"
import type { Parser } from "./compilerRegistry.ts"
import * as InternalParser from "./parser.ts"

/** @internal */
export type ObjectParserState = {
  readonly ast: SchemaAST.Objects
  readonly input: Record<PropertyKey, unknown>
  readonly options: SchemaAST.ParseOptions
  readonly out: Record<PropertyKey, unknown>
  issues: Array<SchemaIssue.Issue> | undefined
}

/** @internal */
export type ParsedProperty = {
  parser: Parser
  readonly name: PropertyKey
  readonly type: SchemaAST.AST
  readonly valueFirst: boolean
}

/** @internal */
export const hasDefaultObjectOptions = (options: SchemaAST.ParseOptions): boolean =>
  options.errors !== "all" &&
  options.onExcessProperty !== "error" && options.onExcessProperty !== "preserve" &&
  options.propertyOrder !== "original"

/** @internal */
export function stepProperty(
  state: ObjectParserState,
  property: ParsedProperty,
  exit: Exit.Exit<unknown, SchemaIssue.Issue>
): Exit.Exit<void, SchemaIssue.Issue> | void {
  if (exit._tag === "Failure") return wrapPropertyKeyIssue(state, state.ast, property.name, exit)
  if (exit === InternalParser.sameExit) return
  const value = (exit as InternalParser.Success<unknown, SchemaIssue.Issue>)[InternalParser.args]
  if (value !== InternalParser.missing) {
    assignProperty(state.out, property.name, value)
    return
  }
  delete state.out[property.name]
  if (property.type.context?.isOptional) return
  const issue = new SchemaIssue.Pointer([property.name], new SchemaIssue.MissingKey(property.type.context?.annotations))
  if (state.options.errors === "all") {
    if (state.issues) state.issues.push(issue)
    else state.issues = [issue]
  } else {
    return Exit.fail(new SchemaIssue.Composite(state.ast, [issue], state.input, state.options))
  }
}

/** @internal */
export const parseProperties = iterateEager<ObjectParserState, ParsedProperty>()({
  onItem(state, property) {
    const name = property.name
    let value: unknown
    if (property.valueFirst) {
      value = state.input[name]
      if (value === undefined && !(name in state.input)) {
        return property.parser(InternalParser.missing, state.options)
      }
    } else {
      const present = name === "__proto__" ? Object.hasOwn(state.input, name) : name in state.input
      if (!present) return property.parser(InternalParser.missing, state.options)
      value = state.input[name]
    }
    assignProperty(state.out, name, value)
    return property.parser(value, state.options)
  },
  step: stepProperty
})

// Continue after a suspended property without re-running earlier properties.
/** @internal */
export const resumeProperties = (
  state: ObjectParserState,
  properties: ReadonlyArray<ParsedProperty>,
  index: number,
  pending: Effect.Effect<unknown, SchemaIssue.Issue, any>
): Effect.Effect<unknown, SchemaIssue.Issue, any> =>
  Effect.flatMap(Effect.exit(pending), (exit) => {
    const terminal = stepProperty(state, properties[index], exit)
    if (terminal) return terminal
    const done = () => InternalParser.succeed(state.out)
    const rest = parseProperties(state, properties, index + 1)
    return rest ? Effect.flatMapEager(rest, done) : done()
  })
