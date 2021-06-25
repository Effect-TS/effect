import ts from "typescript"

export default function rewrite(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const mods = new Map<string, ts.Identifier>()

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression)
          ) {
            const rewrite = checker
              .getResolvedSignature(node)
              ?.getJsDocTags()
              .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)
              .filter((_) => _.startsWith("rewrite"))[0]

            if (rewrite) {
              const [fn, mod] = rewrite.match(/rewrite (.*) from "(.*)"/)!.splice(1)

              if (!mods.has(mod!)) {
                mods.set(mod!, factory.createUniqueName("module"))
              }

              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    mods.get(mod!)!,
                    factory.createIdentifier(fn!)
                  ),
                  undefined,
                  [node.expression.expression, ...node.arguments]
                ),
                visitor,
                ctx
              )
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        const visited = ts.visitNode(sourceFile, visitor)

        const imports = Array.from(mods).map(([mod, id]) =>
          factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamespaceImport(id)
            ),
            factory.createStringLiteral(mod)
          )
        )

        return factory.updateSourceFile(visited, [...imports, ...visited.statements])
      }
    }
  }
}
