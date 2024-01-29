/**
 * @since 1.0.0
 */
import * as AST from "./AST.js"
import * as Schema from "./Schema.js"

/**
 * @category formatting
 * @since 1.0.0
 */
export const format: <R, I, A>(schema: Schema.Schema<R, I, A>) => string = Schema.format

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatAST: (ast: AST.AST, verbose?: boolean) => string = AST.format

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatUnknown: (u: unknown) => string = AST.formatUnknown
