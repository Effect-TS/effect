import ts from "typescript"

import { getCallExpressionMetadata } from "./utils"

interface ParsedPipeSyntaxInfo {
  arguments: Array<ts.Expression>
}

export default function unpipe(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      function parsePipeSyntax(
        node: ts.Node,
        sourceFile: ts.SourceFile
      ): ParsedPipeSyntaxInfo | undefined {
        if (ts.isCallExpression(node)) {
          const { tags } = getCallExpressionMetadata(checker, node, sourceFile)

          // operator pipe call a["|>"](b)
          if (
            ts.isElementAccessExpression(node.expression) &&
            ts.isStringLiteral(node.expression.argumentExpression) &&
            node.expression.argumentExpression.text === "|>" &&
            node.arguments.length === 1
          ) {
            return { arguments: [node.expression.expression, node.arguments[0]!] }
          }

          // plain old pipe(a, b, c, d) call
          if (tags["optimize"] && tags["optimize"].has("pipe")) {
            return { arguments: node.arguments.map((node) => node) }
          }
        }
        return undefined
      }

      function optimizePipeSyntax(
        node: ts.Node,
        parsedInfo: ParsedPipeSyntaxInfo
      ): ts.VisitResult<ts.Node> {
        if (parsedInfo.arguments.length === 0) throw new Error("absurd")

        // start reducing with first node, then accumulate next ones as call
        return parsedInfo.arguments
          .slice(1)
          .reduce(
            (currentNode, memberNode) =>
              ts.setOriginalNode(
                ts.setTextRange(
                  factory.createCallExpression(memberNode, undefined, [currentNode]),
                  memberNode
                ),
                memberNode
              ),
            parsedInfo.arguments[0]!
          )
      }

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          // parse and process node
          const parsedInfo = parsePipeSyntax(node, sourceFile)
          if (parsedInfo) {
            const newNode = ts.visitNode(node, (node) =>
              optimizePipeSyntax(node, parsedInfo)
            )
            return ts.visitEachChild(newNode, visitor, ctx)
          }

          // continue
          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}
