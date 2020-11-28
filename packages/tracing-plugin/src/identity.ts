import ts from "typescript"

export default function tracer(
  _program: ts.Program,
  _opts?: {
    identity?: boolean
  }
) {
  const identityOn = !(_opts?.identity === false)
  const checker = _program.getTypeChecker()
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
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
                        (t): t is ts.JSDocTag => t.tagName.getText() === "optimize"
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
                        (t): t is ts.JSDocTag => t.tagName?.getText() === "optimize"
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

            if (
              identityOn &&
              optimizeTags.has("identity") &&
              node.arguments.length === 1 &&
              !ts.isSpreadElement(node.arguments[0])
            ) {
              return ts.visitEachChild(node, visitor, ctx).arguments[0]
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return identityOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
