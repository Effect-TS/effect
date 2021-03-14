import ts from "typescript"

import { getCallExpressionMetadata, getFirstMetadataTagValue } from "./utils"

interface ParsedDataFirstSyntaxInfo {
  pipeMethodCall: ts.CallExpression
  moduleIdentifier: ts.Expression
  dataFirstName: string
  fa: ts.Expression
  arguments: ts.NodeArray<ts.Expression>
}

export default function dataFirst(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      function parseDataFirstSyntax(
        node: ts.Node,
        sourceFile: ts.SourceFile
      ): ParsedDataFirstSyntaxInfo | undefined {
        // T.function(args)(fa)
        if (
          ts.isCallExpression(node) &&
          ts.isCallExpression(node.expression) &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.arguments.length === 1 &&
          !ts.isSpreadElement(node.arguments[0]!)
        ) {
          const metadata = getCallExpressionMetadata(
            checker,
            node.expression,
            sourceFile
          )
          const dataFirstName = getFirstMetadataTagValue(metadata, "dataFirst")

          // dataFirst jsdoc tag is present
          if (dataFirstName) {
            return {
              pipeMethodCall: node.expression,
              moduleIdentifier: node.expression.expression.expression,
              fa: node.arguments[0]!,
              arguments: node.expression.arguments,
              dataFirstName
            }
          }
        }
        return undefined
      }

      function optimizeDataFirstSyntax(
        node: ts.Node,
        dataFirstSyntax: ParsedDataFirstSyntaxInfo
      ): ts.VisitResult<ts.Node> {
        // we need to change the method expression with the new dataFirst method
        const methodExpression = ts.setOriginalNode(
          ts.setTextRange(
            factory.createPropertyAccessExpression(
              dataFirstSyntax.moduleIdentifier,
              factory.createIdentifier(dataFirstSyntax.dataFirstName)
            ),
            dataFirstSyntax.pipeMethodCall
          ),
          dataFirstSyntax.pipeMethodCall
        )

        // we need to prepend fa as argument
        const argumentsNodeArray = factory.createNodeArray([
          dataFirstSyntax.fa,
          ...dataFirstSyntax.arguments
        ])

        return ts.setOriginalNode(
          ts.setTextRange(
            factory.createCallExpression(
              methodExpression,
              undefined,
              argumentsNodeArray
            ),
            node
          ),
          node
        )
      }

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          // parse and process if necessary
          const parsedInfo = parseDataFirstSyntax(node, sourceFile)
          if (parsedInfo) {
            const newNode = ts.visitNode(node, (node) =>
              optimizeDataFirstSyntax(node, parsedInfo)
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
