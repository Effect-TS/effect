import type * as SchemaAST from "../../SchemaAST.ts"

/** @internal */
export const invalid = Symbol()

/** @internal */
export interface Decoder {
  (input: unknown): unknown | typeof invalid
}

/** @internal */
export interface Compiler {
  (ast: SchemaAST.AST): Decoder | undefined
}

let current: Compiler | undefined

/** @internal */
export const get = (): Compiler | undefined => current

/** @internal */
export const install = (compiler: Compiler): void => {
  current = compiler
}
