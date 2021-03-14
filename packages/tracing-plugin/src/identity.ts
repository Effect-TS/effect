import ts from "typescript"

import { getCallExpressionMetadata, getMetadataTagValues } from "./utils"

interface ParsedIdentitySyntaxInfo {
  fa: ts.Expression
}

export default function identity(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      function parseIdentitySyntax(
        node: ts.Node,
        sourceFile: ts.SourceFile
      ): ParsedIdentitySyntaxInfo | undefined {
        if (
          ts.isCallExpression(node) &&
          node.arguments.length === 1 &&
          !ts.isSpreadElement(node.arguments[0]!)
        ) {
          const metadata = getCallExpressionMetadata(checker, node, sourceFile)
          const optimizeTags = getMetadataTagValues(metadata, "optimize")

          // optimize tag is present and set to identity
          if (optimizeTags.has("identity")) {
            return {
              fa: node.arguments[0]!
            }
          }
        }
        return undefined
      }

      function optimizeIdentitySyntax(
        node: ts.Node,
        parsedInfo: ParsedIdentitySyntaxInfo
      ): ts.VisitResult<ts.Node> {
        return parsedInfo.fa
      }

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          // parse and process if necessary
          const parsedInfo = parseIdentitySyntax(node, sourceFile)
          if (parsedInfo) {
            const newNode = ts.visitNode(node, (node) =>
              optimizeIdentitySyntax(node, parsedInfo)
            )
            return ts.visitEachChild(newNode, visitor, ctx)
          }

          // create the optimized pipe call
          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}
