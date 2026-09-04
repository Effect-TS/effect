import type * as Effect from "../../Effect.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaIssue from "../../SchemaIssue.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export interface Is {
  (input: unknown): unknown | typeof invalid
}

/** @internal */
export interface Parser {
  (
    input: unknown,
    options: SchemaAST.ParseOptions
  ): Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export interface CompiledParser {
  readonly is: Is | undefined
  readonly decode: (
    input: unknown,
    options: SchemaAST.ParseOptions
  ) => Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export interface ResolveParser {
  (ast: SchemaAST.AST): Parser
}

/** @internal */
export interface Compiler {
  (ast: SchemaAST.AST, resolve: ResolveParser): CompiledParser | undefined
}

let current: Compiler | undefined

/** @internal */
export const get = (): Compiler | undefined => current

/** @internal */
export const install = (compiler: Compiler): void => {
  current = compiler
}
