import ts from "typescript"

import type { Config } from "./shared"

function checkOptionalChaining(
  node: ts.PropertyAccessExpression,
  ctx: ts.TransformationContext
) {
  let found: ts.Node | undefined

  function visitor(node: ts.Node): ts.Node {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      return ts.visitEachChild(node, visitor, ctx)
    }

    if (!ts.isPropertyAccessExpression(node)) {
      return node
    }

    if (ts.isPropertyAccessExpression(node) && node.questionDotToken != null) {
      found = node.questionDotToken
      return node
    }

    return ts.visitEachChild(node, visitor, ctx)
  }

  ts.visitNode(node, visitor)

  return found
}

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
        function throwIfOptionalChaining(node: ts.PropertyAccessExpression) {
          const isOptional = checkOptionalChaining(node, ctx)

          if (isOptional) {
            const pos = sourceFile.getLineAndCharacterOfPosition(isOptional.getEnd())
            throw new Error(
              `compiler plugin doesn't support optional chaining: ${
                sourceFile.fileName
              }:${pos.line + 1}:${pos.character}`
            )
          }
        }

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isPropertyAccessExpression(node)) {
            const rewrite = checker
              .getSymbolAtLocation(node)
              ?.getJsDocTags()
              .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)
              .filter((_) => _.startsWith("ets_rewrite_getter"))[0]

            const ets_rewrite_static = checker
              .getSymbolAtLocation(node)
              ?.getJsDocTags()
              .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)
              .filter((_) => _.startsWith("ets_rewrite_static"))[0]

            if (rewrite || ets_rewrite_static) {
              throwIfOptionalChaining(node)
            }

            if (rewrite) {
              const [fn, mod, attachTrace] = rewrite
                .match(/ets_rewrite_getter (.*) from "(.*)"(?:(.*))/)!
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
            } else if (ets_rewrite_static) {
              const [fn, mod] = ets_rewrite_static
                .match(/ets_rewrite_static (.*) from "(.*)"/)!
                .splice(1)

              if (!mods.has(mod!)) {
                mods.set(mod!, factory.createUniqueName("module"))
              }

              const id = mods.get(mod!)!

              return factory.createPropertyAccessExpression(
                id,
                factory.createIdentifier(fn!)
              )
            }
          } else if (
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
              const sigTags = signature
                .getJsDocTags()
                .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`)

              const exprTags =
                checker
                  .getSymbolAtLocation(node.expression)
                  ?.getJsDocTags()
                  .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(" ")}`) || []

              const rewrite = sigTags.filter((_) =>
                _.startsWith("ets_rewrite_method")
              )[0]

              const rewriteStatic = [...sigTags, ...exprTags].filter((_) =>
                _.startsWith("ets_rewrite_static")
              )[0]

              if (rewrite || rewriteStatic) {
                throwIfOptionalChaining(node.expression)
              }

              const processedArguments =
                rewrite || rewriteStatic
                  ? node.arguments.map((x) => {
                      const ds = getSignatureIfSole(checker, x)?.getDeclaration()
                      const params = ds?.parameters

                      if (
                        params?.length === 2 &&
                        params[1]?.name.getText() === "__trace"
                      ) {
                        return factory.createCallExpression(
                          traceCallLastId,
                          undefined,
                          [ts.visitNode(x, visitor), getTrace(x)]
                        )
                      }

                      return ts.visitNode(x, visitor)
                    })
                  : node.arguments

              if (rewriteStatic) {
                const [fn, mod] = rewriteStatic
                  .match(/ets_rewrite_static (.*) from "(.*)"/)!
                  .splice(1)

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

                const nodeNew = factory.updateCallExpression(
                  node,
                  factory.createPropertyAccessExpression(
                    mods.get(mod!)!,
                    factory.createIdentifier(fn!)
                  ),
                  node.typeArguments,
                  [...processedArguments, ...additions]
                )

                nodeNew["_ets_sig_tags"] = sigTags

                return nodeNew
              }

              if (rewrite) {
                const [fn, mod] = rewrite
                  .match(/ets_rewrite_method (.*) from "(.*)"/)!
                  .splice(1)

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
