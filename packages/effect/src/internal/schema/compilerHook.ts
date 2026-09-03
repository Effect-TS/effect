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
export interface DecoderCompiler {
  (ast: SchemaAST.AST): Decoder | undefined
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
  readonly decode: DecoderCompiler
  readonly is: DecoderCompiler
}

let current: Compiler | undefined

/** @internal */
export const get = (): Compiler | undefined => current

/** @internal */
export const install = (compiler: Compiler): void => {
  current = compiler
}
