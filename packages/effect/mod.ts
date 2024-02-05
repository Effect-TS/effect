import type k from "ast-types/gen/kinds.js"
import type cs from "jscodeshift"

const enabled = {
  swapLayerParams: false,
  swapSTMParams: false,
  swapSTMGenParams: false,
  cleanupSTM: false,
  cleanupEffect: false,
  cleanupStream: false,
  cleanupExit: false
}

const cleanup = (name: string) => (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const is = filter(ast, name)
  if (
    is(ast.value.typeName) &&
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
const cleanupSTM = cleanup("STM")

const filter = (ast: cs.ASTPath<cs.TSTypeReference>, nodeName: string) => {
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
  return is
}

const swapParams = (nodeName: string) => (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const is = filter(ast, nodeName)
  if (
    is(ast.value.typeName) &&
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

const swapSTMParams = swapParams("STM")
const swapSTMGenParams = swapParams("STMGen")
const swapLayerParams = swapParams("Layer")

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
    if (enabled.swapLayerParams) {
      swapLayerParams(ast)
    }
    if (enabled.swapSTMParams) {
      swapSTMParams(ast)
    }
    if (enabled.swapSTMGenParams) {
      swapSTMGenParams(ast)
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
    if (enabled.cleanupSTM) {
      cleanupSTM(ast)
    }
  })

  return root.toSource()
}
