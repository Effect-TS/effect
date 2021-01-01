import ts from "typescript"

function hasYield(node: ts.Node): boolean {
  if (ts.isYieldExpression(node)) {
    return true
  } else {
    return ts.forEachChild(node, hasYield) || false
  }
}

export default function unflow(
  _program: ts.Program,
  _opts?: {
    flow?: boolean
  }
) {
  const flowOn = !(_opts?.flow === false)
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node, inGen: boolean): ts.VisitResult<ts.Node> {
          if (ts.isFunctionDeclaration(node) && node.asteriskToken) {
            return ts.visitEachChild(node, (x) => visitor(x, true), ctx)
          }

          if (ts.isFunctionExpression(node) && node.asteriskToken) {
            return ts.visitEachChild(node, (x) => visitor(x, true), ctx)
          }

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

            if (flowOn && optimizeTags.has("flow") && (!inGen || !hasYield(node))) {
              const shortcut =
                checker
                  .getTypeAtLocation(node.arguments[0])
                  .getCallSignatures()
                  .find(
                    (s) =>
                      s.getParameters().length > 1 ||
                      s
                        .getParameters()
                        .some((p) => p.valueDeclaration.getText().includes("..."))
                  ) == null

              const id = factory.createIdentifier("args")

              if (node.arguments.find(ts.isSpreadElement) == null) {
                return factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      shortcut
                        ? undefined
                        : factory.createToken(ts.SyntaxKind.DotDotDotToken),
                      id,
                      undefined,
                      undefined,
                      undefined
                    )
                  ],
                  undefined,
                  factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  optimiseFlow(
                    ts.visitEachChild(node, (x) => visitor(x, inGen), ctx).arguments,
                    factory,
                    shortcut ? id : factory.createSpreadElement(id)
                  )
                )
              }
            }
          }

          return ts.visitEachChild(node, (x) => visitor(x, inGen), ctx)
        }

        return flowOn
          ? ts.visitEachChild(sourceFile, (x) => visitor(x, false), ctx)
          : sourceFile
      }
    }
  }
}

function optimiseFlow(
  args: ArrayLike<ts.Expression>,
  factory: ts.NodeFactory,
  x: ts.Expression
): ts.Expression {
  if (args.length === 1) {
    return factory.createCallExpression(args[0], undefined, [x])
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [
    optimiseFlow(newArgs, factory, x)
  ])
}
