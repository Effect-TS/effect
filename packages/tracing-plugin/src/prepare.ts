import ts from "typescript"

export default function prepare(_program: ts.Program) {
  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory
      const checker = _program.getTypeChecker()

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            const args = node.arguments.map((arg) => {
              const symbolArg = checker.getSymbolAtLocation(arg)
              const declarations = symbolArg?.getDeclarations()
              if (declarations?.length === 1) {
                const declaration = declarations[0]!
                if (
                  ts.isFunctionDeclaration(declaration) &&
                  declaration.parameters.length === 2
                ) {
                  const parameters = declaration.parameters
                  const traceLast =
                    parameters[parameters.length - 1]!.name.getText() === "__trace"

                  if (traceLast) {
                    return factory.createArrowFunction(
                      undefined,
                      undefined,
                      [
                        factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          undefined,
                          factory.createIdentifier("x"),
                          undefined,
                          undefined,
                          undefined
                        )
                      ],
                      undefined,
                      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                      factory.createCallExpression(arg, undefined, [
                        factory.createIdentifier("x")
                      ])
                    )
                  }
                }
              }
              return ts.visitNode(arg, visitor)
            })

            return factory.updateCallExpression(
              node,
              ts.visitNode(node.expression, visitor),
              node.typeArguments,
              args
            )
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitNode(sourceFile, visitor)
      }
    }
  }
}
