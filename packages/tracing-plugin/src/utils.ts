import type ts from "typescript"

const emptyTags = new Set<string>()

export interface CallExpressionMetaData {
  tags: Record<string, Set<string>>
  traceArgumentIndex: number
}

export function getCallExpressionMetadata(
  typeChecker: ts.TypeChecker,
  callExpression: ts.CallExpression,
  sourceFile: ts.SourceFile
) {
  // create the result object
  const metadata: CallExpressionMetaData = {
    tags: {},
    traceArgumentIndex: -1
  }

  // use the symbol of the expression to get all available call signatures
  const symbol = typeChecker.getSymbolAtLocation(callExpression.expression)
  let allSignatures: readonly ts.Signature[] = []
  if (symbol) {
    const type = typeChecker.getTypeOfSymbolAtLocation(symbol, callExpression)
    allSignatures = type.getCallSignatures()
  }

  // resolved signature tags, and checks if actually available
  let signature = typeChecker.getResolvedSignature(callExpression)

  // ensure used signature is actually present in all the available ones
  if (
    allSignatures.indexOf(signature ? (signature as any).target : undefined) === -1 &&
    allSignatures.indexOf(signature!) === -1
  ) {
    if (signature) {
      const isImplementationOfOverload = typeChecker.isImplementationOfOverload(
        signature.getDeclaration()
      )
      if (isImplementationOfOverload) {
        signature = allSignatures.length > 0 ? allSignatures[0] : undefined
      }
    } else {
      signature = allSignatures.length > 0 ? allSignatures[0] : undefined
    }
  }

  let tags: ts.JSDocTagInfo[] = []
  if (signature) {
    // loads the tags
    tags = signature.getJsDocTags()

    // if no one is found, use first signature
    if (allSignatures.length > 1 && tags.length === 0) {
      tags = allSignatures[0]!.getJsDocTags()
    }
  }

  // loop through tags, and record them
  tags.forEach((tag) => {
    metadata.tags[tag.name] = metadata.tags[tag.name] || new Set()
    if (tag.text) metadata.tags[tag.name]?.add(tag.text)
  })

  // record trace argument index
  if (signature) {
    metadata.traceArgumentIndex = signature.parameters.findIndex(
      (argSymbol) => argSymbol.name === "__trace"
    )
  }

  return metadata
}

export function getFirstMetadataTagValue(
  metadata: CallExpressionMetaData,
  tagName: string
): string | undefined {
  const tags = metadata.tags[tagName]
  if (tags) {
    for (const tagValue of tags) {
      return tagValue
    }
  }
  return undefined
}

export function getMetadataTagValues(
  metadata: CallExpressionMetaData,
  tagName: string
): Set<string> {
  const tags = metadata.tags[tagName]
  return tags ? tags : emptyTags
}
