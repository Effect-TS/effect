import type cs from "jscodeshift"

//
// this is needed to resolve a bug in jscodeshift that
// forgets to traverse type parameters in call expressions
//
declare module "ast-types/gen/namedTypes.js" {
  namespace namedTypes {
    interface CallExpression extends TSHasOptionalTypeParameterInstantiation {}
  }
}

export default function transformer(file: cs.FileInfo, api: cs.API) {
  const j = api.jscodeshift

  const root = j(file.source)

  root.find(j.ExportNamedDeclaration, {
    declaration: {
      type: "VariableDeclaration",
      declarations: [{
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          typeAnnotation: {
            type: "TSTypeAnnotation",
            typeAnnotation: {
              type: "TSTypeLiteral",
              members: [{ type: "TSCallSignatureDeclaration" }]
            }
          }
        }
      }]
    }
  }).forEach((path) => {
    const comments = path.node.comments ?? []
    j(path).find(j.TSCallSignatureDeclaration).forEach((path) => {
      // Don't override comments if they already exist
      if (!Array.isArray(path.node.comments)) {
        path.node.comments = comments
      }
    })
  })

  root.find(j.ExportNamedDeclaration, {
    declaration: {
      type: "VariableDeclaration",
      declarations: [{
        type: "VariableDeclarator",
        init: {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: "dual"
          }
        }
      }]
    }
  }).forEach((path) => {
    const comments = path.node.comments ?? []
    j(path).find(j.CallExpression).forEach((path) => {
      path.node.typeParameters?.params.forEach((param) => {
        // Don't override comments if they already exist
        if (!Array.isArray(param.comments)) {
          param.comments = comments
        }
      })
    })
  })

  return root.toSource()
}
