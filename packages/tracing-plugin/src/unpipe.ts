import ts from "typescript"

export default function unpipe(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (
            ts.isCallExpression(node) &&
            ts.isElementAccessExpression(node.expression) &&
            ts.isStringLiteral(node.expression.argumentExpression) &&
            node.expression.argumentExpression.text === "|>" &&
            node.arguments.length === 1
          ) {
            const overloadDeclarations = checker
              .getResolvedSignature(node)
              ?.getDeclaration()

            const optimizeTags = overloadDeclarations
              ? (() => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "ets_optimize"
                      )
                      .map((e) => e.comment)
                      .filter((s): s is string => s != null)
                  } catch {
                    return undefined
                  }
                })()
              : undefined

            return optimizeTags?.includes("operator")
              ? factory.createCallExpression(
                  ts.visitNode(node.arguments[0]!, visitor),
                  [],
                  [ts.visitNode(node.expression.expression, visitor)]
                )
              : ts.visitEachChild(node, visitor, ctx)
          } else if (ts.isCallExpression(node)) {
            const symbol = checker.getTypeAtLocation(node.expression).getSymbol()

            const overloadDeclarations = checker
              .getResolvedSignature(node)
              ?.getDeclaration()

            const optimizeTagsOverload = overloadDeclarations
              ? (() => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "ets_optimize"
                      )
                      .map((e) => e.comment)
                      .filter((s): s is string => s != null)
                  } catch {
                    return undefined
                  }
                })()
              : undefined

            const optimizeTagsMain =
              symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName?.getText() === "ets_optimize"
                      )
                      .map((e) => e.comment)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            const optimizeTags = new Set([
              ...optimizeTagsMain,
              ...(optimizeTagsOverload || [])
            ])

            if (optimizeTags.has("pipe")) {
              if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                return factory.createParenthesizedExpression(
                  optimisePipe(
                    Array.from(ts.visitEachChild(node, visitor, ctx).arguments),
                    factory
                  )
                )
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}

function optimisePipe(
  args: Array<ts.Expression>,
  factory: ts.NodeFactory
): ts.Expression {
  return args
    .slice(1)
    .reduce(
      (currentNode, memberNode) =>
        factory.createCallExpression(memberNode, undefined, [currentNode]),
      args[0]!
    )
}
