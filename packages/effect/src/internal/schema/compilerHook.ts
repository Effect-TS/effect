import type * as Effect from "../../Effect.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaIssue from "../../SchemaIssue.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export interface Is {
  (input: unknown, options: SchemaAST.ParseOptions): boolean
  readonly default: (input: unknown) => boolean
}

/** @internal */
export interface Validate {
  (input: unknown, options: SchemaAST.ParseOptions): unknown | typeof invalid
  readonly default: (input: unknown) => unknown | typeof invalid
}

/** @internal */
export interface Parser {
  (
    input: unknown,
    options: SchemaAST.ParseOptions
  ): Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export const CompiledParserTypeId = Symbol()

/** @internal */
export interface CompiledParser {
  readonly kind: "Type" | "Decode"
  readonly is: Is | undefined
  readonly validate: Validate | undefined
  readonly parser: Parser
  readonly decode: (
    input: unknown,
    options: SchemaAST.ParseOptions
  ) => Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/** @internal */
export const getCompiledParser = (parser: Parser): CompiledParser | undefined =>
  (parser as Parser & { readonly [CompiledParserTypeId]?: CompiledParser })[CompiledParserTypeId]

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
