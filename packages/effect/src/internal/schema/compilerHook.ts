import type * as Cause from "../../Cause.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaIssue from "../../SchemaIssue.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export interface Decoder {
  (input: unknown): unknown | typeof invalid
}

/** @internal */
export class DecoderFailure {
  readonly cause: Cause.Cause<SchemaIssue.Issue>
  constructor(cause: Cause.Cause<SchemaIssue.Issue>) {
    this.cause = cause
  }
}

/** @internal */
export interface Compiler {
  readonly decode: (ast: SchemaAST.AST) => Decoder | undefined
  readonly is: (ast: SchemaAST.AST) => Decoder | undefined
}

let current: Compiler | undefined

/** @internal */
export const get = (): Compiler | undefined => current

/** @internal */
export const install = (compiler: Compiler): void => {
  current = compiler
}
