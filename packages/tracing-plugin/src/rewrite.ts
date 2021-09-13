/* eslint-disable no-inner-declarations */
import ts from "typescript"

import type { Config } from "./shared"

function checkOptionalChaining(
  node: ts.PropertyAccessExpression,
  ctx: ts.TransformationContext
) {
  let found: ts.Node | undefined

  function visitor(_node: ts.Node): ts.Node {
    if (ts.isCallExpression(_node) && ts.isPropertyAccessExpression(_node.expression)) {
      return ts.visitEachChild(_node, visitor, ctx)
    }

    if (!ts.isPropertyAccessExpression(_node)) {
      return _node
    }

    if (ts.isPropertyAccessExpression(_node) && _node.questionDotToken != null) {
      found = _node.questionDotToken
      return _node
    }

    return ts.visitEachChild(_node, visitor, ctx)
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
        const opt_chain_var = factory.createUniqueName("opt_chain")
        const opt_chain_var_node = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                opt_chain_var,
                undefined,
                undefined,
                factory.createVoidExpression(factory.createNumericLiteral("0"))
              )
            ],
            ts.NodeFlags.None
          )
        )
        // eslint-disable-next-line prefer-const
        let opt_chain_var_used = false

        function wrapOptChain(
          should: boolean,
          body: ts.Expression,
          callExpr: (_: ts.Expression) => ts.Expression
        ) {
          if (should) {
            opt_chain_var_used = true

            return factory.createBinaryExpression(
              factory.createBinaryExpression(
                opt_chain_var,
                factory.createToken(ts.SyntaxKind.EqualsToken),
                body
              ),
              factory.createToken(ts.SyntaxKind.CommaToken),
              factory.createConditionalExpression(
                opt_chain_var,
                factory.createToken(ts.SyntaxKind.QuestionToken),
                callExpr(opt_chain_var),
                factory.createToken(ts.SyntaxKind.ColonToken),
                factory.createVoidExpression(factory.createNumericLiteral("0"))
              )
            )
          } else {
            return callExpr(body)
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

            if (rewrite) {
              let opt_chain = false

              if (checkOptionalChaining(node, ctx)) {
                opt_chain = true
              }

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

              return wrapOptChain(
                opt_chain,
                ts.visitNode(node.expression, visitor),
                (x) =>
                  factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      id,
                      factory.createIdentifier(fn!)
                    ),
                    undefined,
                    [x, ...post]
                  )
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
                let opt_chain = false

                if (checkOptionalChaining(node.expression, ctx)) {
                  opt_chain = true
                }

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

                return wrapOptChain(
                  opt_chain,
                  ts.visitNode(node.expression.expression, visitor),
                  (x) =>
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(
                        mods.get(mod!)!,
                        factory.createIdentifier(fn!)
                      ),
                      undefined,
                      [x, ...processedArguments, ...additions]
                    )
                )
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        const updated = ts.visitNode(sourceFile, visitor)

        return factory.updateSourceFile(
          updated,
          opt_chain_var_used
            ? [opt_chain_var_node, ...updated.statements]
            : updated.statements,
          updated.isDeclarationFile,
          updated.referencedFiles,
          updated.typeReferenceDirectives,
          updated.hasNoDefaultLib,
          updated.libReferenceDirectives
        )
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
