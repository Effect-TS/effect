import ts from "typescript"

export default function unpipe(
  _program: ts.Program,
  _opts?: {
    pipe?: boolean
  }
) {
  const pipeOn = !(_opts?.pipe === false)
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

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

            if (pipeOn && optimizeTags.has("pipe")) {
              if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                return optimisePipe(
                  ts.visitEachChild(node, visitor, ctx).arguments,
                  factory
                )
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return pipeOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}

function optimisePipe(
  args: ArrayLike<ts.Expression>,
  factory: ts.NodeFactory
): ts.Expression {
  if (args.length === 1) {
    return args[0]
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [
    optimisePipe(newArgs, factory)
  ])
}
