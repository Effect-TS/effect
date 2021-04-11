import ts from "typescript"

export default function dataFirst(_program: ts.Program) {
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
            !ts.isSpreadElement(node.arguments[0]!)
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
                  dataFirstTag === "self"
                    ? node.expression.expression
                    : factory.createPropertyAccessExpression(
                        node.expression.expression.expression,
                        factory.createIdentifier(dataFirstTag)
                      ),
                  undefined,
                  [node.arguments[0]!, ...node.expression.arguments]
                ),
                visitor,
                ctx
              )
            }
          } else if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            node.arguments.length === 1 &&
            !ts.isSpreadElement(node.arguments[0]!)
          ) {
            const tags = signatureTags(checker.getResolvedSignature(node.expression))

            if (tags["dataFirst"] && tags["dataFirst"].includes("self")) {
              return ts.visitEachChild(
                factory.createCallExpression(node.expression.expression, undefined, [
                  node.arguments[0]!,
                  ...node.expression.arguments
                ]),
                visitor,
                ctx
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}

function signatureTags(signature: ts.Signature | undefined) {
  const tags: Record<string, (string | undefined)[]> = {}

  for (const entry of signature?.getJsDocTags().map((t) => [t.name, t.text] as const) ||
    []) {
    if (!tags[entry[0]]) {
      tags[entry[0]] = []
    }
    tags[entry[0]!]!.push(entry[1])
  }
  return tags
}
