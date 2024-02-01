/**
 * @since 1.0.0
 */
import * as AST from "./AST.js"
import * as Schema from "./Schema.js"

/**
 * @category formatting
 * @since 1.0.0
 */
export const format: <A, I, R>(schema: Schema.Schema<A, I, R>) => string = Schema.format

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
