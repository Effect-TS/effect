import ts from "typescript"

export default function tracer(
  _program: ts.Program,
  _opts?: {
    dataFirst?: boolean
  }
) {
  const dataFirstOn = !(_opts?.dataFirst === false)
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            node.arguments.length === 1 &&
            !ts.isSpreadElement(node.arguments[0])
          ) {
            const symbol = checker
              .getTypeAtLocation(node.expression.expression)
              .getSymbol()

            const dataFirstTag = symbol
              ?.getDeclarations()
              ?.map((e) => {
                try {
                  return ts
                    .getAllJSDocTags(
                      e,
                      (t): t is ts.JSDocTag => t.tagName?.getText() === "dataFirst"
                    )
                    .map((e) => e.comment)
                } catch {
                  return []
                }
              })
              .reduce((flatten, entry) => flatten.concat(entry), [])[0]

            if (dataFirstTag) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    node.expression.expression.expression,
                    factory.createIdentifier(dataFirstTag)
                  ),
                  undefined,
                  [node.arguments[0], ...node.expression.arguments]
                ),
                visitor,
                ctx
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return dataFirstOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
