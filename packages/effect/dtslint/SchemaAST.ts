import * as AST from "effect/SchemaAST"

// ---------------------------------------------
// annotations
// ---------------------------------------------

// @ts-expect-error
AST.annotations(AST.stringKeyword, { a: 1 })

// $ExpectType AST
AST.annotations(AST.stringKeyword, { [Symbol.for("a")]: 1 })
