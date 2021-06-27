import ts from "typescript"

import type { Config } from "./shared"

export default function rewrite(_program: ts.Program) {
  return {
    before(ctx: ts.TransformationContext) {
      return (
        sourceFile: ts.SourceFile,
        {
          checkRegionAt,
          checker,
          factory,
          getTrace,
          mods,
          regions,
          traceCallLastId,
          tracingOn
        }: Config
      ) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isPropertyAccessExpression(node)) {
            const rewrite = checker
              .getSymbolAtLocation(node)
              ?.getJsDocTags()
              .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)
              .filter((_) => _.startsWith("rewriteGetter"))[0]

            if (rewrite) {
              const [fn, mod, attachTrace] = rewrite
                .match(/rewriteGetter (.*) from "(.*)"(?:(.*))/)!
                .splice(1)

              if (!mods.has(mod!)) {
                mods.set(mod!, factory.createUniqueName("module"))
              }

              const id = mods.get(mod!)!

              const post = [] as ts.Expression[]

              if (attachTrace?.trim() === "trace") {
                post.push(getTrace(node))
              }

              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    id,
                    factory.createIdentifier(fn!)
                  ),
                  undefined,
                  [node.expression, ...post]
                ),
                visitor,
                ctx
              )
            }
          }
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression)
          ) {
            const signature = checker.getResolvedSignature(node)

            let isTracing = false

            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(
                node.expression.getEnd()
              )

              isTracing =
                tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (signature) {
              const rewrite = signature
                .getJsDocTags()
                .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)
                .filter((_) => _.startsWith("rewrite"))[0]

              if (rewrite) {
                const processedArguments = node.arguments.map((x) => {
                  const ds = getSignatureIfSole(checker, x)?.getDeclaration()
                  const params = ds?.parameters

                  if (params?.length === 2 && params[1]?.name.getText() === "__trace") {
                    return factory.createCallExpression(traceCallLastId, undefined, [
                      ts.visitNode(x, visitor),
                      getTrace(x)
                    ])
                  }

                  return ts.visitNode(x, visitor)
                })

                const [fn, mod] = rewrite.match(/rewrite (.*) from "(.*)"/)!.splice(1)

                if (mod === "smart:identity") {
                  return ts.visitNode(node.expression.expression, visitor)
                }

                if (mod === "smart:pipe") {
                  return factory.createCallExpression(
                    processedArguments[0]!,
                    [],
                    [ts.visitNode(node.expression.expression, visitor)]
                  )
                }

                const additions = [] as ts.Expression[]

                if (
                  isTracing &&
                  signature.parameters.length > node.arguments.length &&
                  signature.parameters[signature.parameters.length - 1]?.name ===
                    "__trace"
                ) {
                  additions.push(getTrace(node.expression))
                }

                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName("module"))
                }

                return factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    mods.get(mod!)!,
                    factory.createIdentifier(fn!)
                  ),
                  undefined,
                  [
                    ts.visitNode(node.expression.expression, visitor),
                    ...processedArguments,
                    ...additions
                  ]
                )
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitNode(sourceFile, visitor)
      }
    }
  }
}

function getSignatureIfSole(
  checker: ts.TypeChecker,
  node: ts.Expression
): ts.Signature | undefined {
  const ds = checker.getTypeAtLocation(node).getCallSignatures()

  if (ds?.length !== 1) {
    return undefined
  }

  return ds?.[0]
}
