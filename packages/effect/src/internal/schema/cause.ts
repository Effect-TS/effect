import * as Cause from "../../Cause.ts"
import * as Exit from "../../Exit.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"

/** @internal */
export function wrapPropertyKeyIssue(
  state: {
    readonly input: unknown
    readonly options: SchemaAST.ParseOptions
    issues: Array<SchemaIssue.Issue> | undefined
  },
  ast: SchemaAST.AST,
  key: PropertyKey,
  exit: Exit.Failure<any, SchemaIssue.Issue>
): Exit.Exit<void, SchemaIssue.Issue> | undefined {
  if (exit.cause.reasons.length === 0) return exit
  const issue = getSchemaIssue(exit.cause)
  if (issue === undefined) {
    return Exit.failCause(
      Cause.map(
        exit.cause,
        (issue) => new SchemaIssue.Composite(ast, [new SchemaIssue.Pointer([key], issue)], state.input, state.options)
      )
    )
  }
  const pointer = new SchemaIssue.Pointer([key], issue)
  if (state.options.errors === "all") {
    if (state.issues) state.issues.push(pointer)
    else state.issues = [pointer]
  } else {
    return Exit.fail(new SchemaIssue.Composite(ast, [pointer], state.input, state.options))
  }
}

/** @internal */
export function getSchemaIssue(cause: Cause.Cause<SchemaIssue.Issue>): SchemaIssue.Issue | undefined {
  let issue: SchemaIssue.Issue | undefined
  for (const reason of cause.reasons) {
    if (!Cause.isFailReason(reason) || !SchemaIssue.isIssue(reason.error)) {
      return undefined
    }
    issue ??= reason.error
  }
  return issue
}

/** @internal */
export function getSchemaIssueOrThrow(
  cause: Cause.Cause<SchemaIssue.Issue>,
  message: string
): SchemaIssue.Issue {
  const issue = getSchemaIssue(cause)
  if (issue === undefined) {
    throw new Error(message, { cause })
  }
  return issue
}
