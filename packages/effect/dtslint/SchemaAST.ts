import * as AST from "effect/SchemaAST"

// ---------------------------------------------
// annotations
// ---------------------------------------------

// should allow to add custom string annotations to a schema
// $ExpectType AST
AST.annotations(AST.stringKeyword, { a: 1 })

// should allow to add custom symbol annotations to a schema
// $ExpectType AST
AST.annotations(AST.stringKeyword, { [Symbol.for("a")]: 1 })
