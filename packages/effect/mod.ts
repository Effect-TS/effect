import type k from "ast-types/gen/kinds.js"
import type cs from "jscodeshift"

const enabled = {
  swapEitherParams: true,
  swapLayerParams: false,
  swapSTMParams: false,
  swapSTMGenParams: false,
  swapDeferredParams: false,
  swapTDeferredParams: false,
  swapTakeParams: false,
  swapFiberParams: false,
  swapRuntimeFiberParams: false,
  swapFiberSetParams: false,
  swapRequestParams: false,
  swapResourceParams: false,
  swapTExitParams: false,
  swapChannelParams: false,
  swapSinkParams: false,
  cleanupEither: true,
  cleanupSTM: false,
  cleanupEffect: false,
  cleanupStream: false,
  cleanupExit: false,
  cleanupTake: false
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
const cleanupTake = cleanup("Take")
const cleanupEither = cleanup("Either")

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

const swapParamsREA = (nodeName: string) => (ast: cs.ASTPath<cs.TSTypeReference>) => {
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

const swapParamsEA = (nodeName: string) => (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const is = filter(ast, nodeName)
  if (
    is(ast.value.typeName) &&
    ast.value.typeParameters &&
    ast.value.typeParameters.params.length === 2
  ) {
    const params = ast.value.typeParameters.params
    const newParams = [params[1], params[0]]
    popNever(newParams)
    ast.value.typeParameters.params = newParams
  }
}

const swapDeferredParams = swapParamsEA("Deferred")
const swapTDeferredParams = swapParamsEA("TDeferred")
const swapTakeParams = swapParamsEA("Take")
const swapFiberParams = swapParamsEA("Fiber")
const swapRuntimeFiberParams = swapParamsEA("FiberRuntime")
const swapFiberSetParams = swapParamsEA("FiberSet")
const swapRequestParams = swapParamsEA("Request")
const swapResourceParams = swapParamsEA("Resource")
const swapTExitParams = swapParamsEA("TExit")
const swapEitherParams = swapParamsEA("Either")

// from: Channel<out Env, in InErr, in InElem, in InDone, out OutErr, out OutElem, out OutDone>
// to: Channel<OutElem, InElem = unknown, OutErr = never, InErr = unknown, OutDone = void, InDone = unknown, Env = never>
const swapChannelParams = (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const is = filter(ast, "Channel")
  if (
    is(ast.value.typeName) &&
    ast.value.typeParameters &&
    ast.value.typeParameters.params.length === 7
  ) {
    const params = ast.value.typeParameters.params
    const newParams = [params[5], params[2], params[4], params[1], params[6], params[3], params[0]]
    popNever(newParams)
    ast.value.typeParameters.params = newParams
  }
}

// from: Sink<out R, out E, in In, out L, out Z>
// to: Sink<out Z, in In = unknown, out L = never, out E = never, out R = never>
const swapSinkParams = (ast: cs.ASTPath<cs.TSTypeReference>) => {
  const is = filter(ast, "Sink")
  if (
    is(ast.value.typeName) &&
    ast.value.typeParameters &&
    ast.value.typeParameters.params.length === 5
  ) {
    const params = ast.value.typeParameters.params
    const newParams = [params[4], params[2], params[3], params[1], params[0]]
    popNever(newParams)
    popNever(newParams)
    popNever(newParams)
    ast.value.typeParameters.params = newParams
  }
}

const swapSTMParams = swapParamsREA("STM")
const swapSTMGenParams = swapParamsREA("STMGen")
const swapLayerParams = swapParamsREA("Layer")

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
    if (enabled.swapEitherParams) {
      swapEitherParams(ast)
    }
    if (enabled.swapLayerParams) {
      swapLayerParams(ast)
    }
    if (enabled.swapSTMParams) {
      swapSTMParams(ast)
    }
    if (enabled.swapSTMGenParams) {
      swapSTMGenParams(ast)
    }
    if (enabled.swapDeferredParams) {
      swapDeferredParams(ast)
    }
    if (enabled.swapTDeferredParams) {
      swapTDeferredParams(ast)
    }
    if (enabled.swapTakeParams) {
      swapTakeParams(ast)
    }
    if (enabled.swapFiberParams) {
      swapFiberParams(ast)
    }
    if (enabled.swapRuntimeFiberParams) {
      swapRuntimeFiberParams(ast)
    }
    if (enabled.swapFiberSetParams) {
      swapFiberSetParams(ast)
    }
    if (enabled.swapRequestParams) {
      swapRequestParams(ast)
    }
    if (enabled.swapResourceParams) {
      swapResourceParams(ast)
    }
    if (enabled.swapTExitParams) {
      swapTExitParams(ast)
    }
    if (enabled.swapChannelParams) {
      swapChannelParams(ast)
    }
    if (enabled.swapSinkParams) {
      swapSinkParams(ast)
    }
    if (enabled.cleanupEither) {
      cleanupEither(ast)
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
    if (enabled.cleanupTake) {
      cleanupTake(ast)
    }
  })

  return root.toSource()
}
