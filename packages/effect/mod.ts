import type k from "ast-types/gen/kinds.js"
import type cs from "jscodeshift"

const enabled = {
  swapSTMParams: false,
  cleanupEffect: false,
  cleanupStream: false,
  cleanupExit: false
}

const cleanup = (nodeName: string) => (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const name = ast.value.typeName
  const is = (node: typeof name): boolean => {
    switch (node.type) {
      case "Identifier": {
        if (node.name === nodeName) {
          return true
        }
        return false
      }
      case "JSXIdentifier": {
        return false
      }
      case "TSQualifiedName": {
        return is(node.right)
      }
      case "TSTypeParameter": {
        return false
      }
    }
  }
  if (
    is(name) &&
    ast.value.typeParameters
  ) {
    const params = ast.value.typeParameters.params
    const len = params.length
    for (let i = 1; i < len; i++) {
      popNever(params)
    }
  }
}

const cleanupEffect = cleanup("Effect")
const cleanupStream = cleanup("Stream")
const cleanupExit = cleanup("Exit")

const swapSTMParams = (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const name = ast.value.typeName
  const isSTM = (node: typeof name): boolean => {
    switch (node.type) {
      case "Identifier": {
        if (node.name === "STM") {
          return true
        }
        return false
      }
      case "JSXIdentifier": {
        return false
      }
      case "TSQualifiedName": {
        return isSTM(node.right)
      }
      case "TSTypeParameter": {
        return false
      }
    }
  }
  if (
    isSTM(name) &&
    ast.value.typeParameters &&
    ast.value.typeParameters.params.length === 3
  ) {
    const params = ast.value.typeParameters.params
    const newParams = [params[2], params[1], params[0]]
    popNever(newParams)
    popNever(newParams)
    ast.value.typeParameters.params = newParams
  }
}

const popNever = (params: Array<k.TSTypeKind>) => {
  if (params.length > 0 && params[params.length - 1].type === "TSNeverKeyword") {
    params.pop()
  }
}

export default function transformer(file: cs.FileInfo, api: cs.API) {
  const j = api.jscodeshift
  const root = j(file.source)

  const forEveryTypeReference = (node: typeof root, f: (ast: cs.ASTPath<cs.TSTypeReference>) => void) => {
    node.find(j.TSTypeReference).forEach((ast) => {
      f(ast)
    })
    node.find(j.CallExpression).forEach((path) => {
      const typeParams = (path.value as any).typeParameters as cs.TSTypeParameterInstantiation
      if (typeParams) {
        j(typeParams).find(j.TSTypeReference).forEach((tref) => {
          f(tref)
        })
      }
    })
  }

  forEveryTypeReference(root, (ast) => {
    if (enabled.swapSTMParams) {
      swapSTMParams(ast)
    }
    if (enabled.cleanupEffect) {
      cleanupEffect(ast)
    }
    if (enabled.cleanupStream) {
      cleanupStream(ast)
    }
    if (enabled.cleanupExit) {
      cleanupExit(ast)
    }
  })

  return root.toSource()
}
