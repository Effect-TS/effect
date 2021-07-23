import ts from "typescript"

import type { Config } from "./shared"

export default function tracer(_program: ts.Program) {
  return {
    before(ctx: ts.TransformationContext) {
      return (
        sourceFile: ts.SourceFile,
        {
          checkRegionAt,
          checker,
          factory,
          getTrace,
          isDisabledEverywhere,
          regions,
          traceCallId,
          traceCallLastId,
          tracingOn
        }: Config
      ) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isFunctionDeclaration(node)) {
            const tags = ts
              .getJSDocTags(node)
              .map((tag) => `${tag.tagName.escapedText} ${tag.comment}`)

            if (tags.includes("ets_trace off")) {
              return node
            }
          } else if (ts.isCallExpression(node)) {
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

            if (isTracing) {
              const trace = getTrace(node.expression)

              const signature =
                checker.getResolvedSignature(node) ??
                getSignatureIfSole(checker, node.expression)

              const signatureDeclaration = signature?.getDeclaration()

              const declarationParameters = Array.from<ts.ParameterDeclaration>(
                signatureDeclaration?.parameters || []
              )

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

              const processedExpression = ts.visitNode(node.expression, visitor)

              const isTraceLastParameter =
                declarationParameters.length > 0
                  ? declarationParameters[
                      declarationParameters.length - 1
                    ]!.name.getText() === "__trace"
                  : false

              const shouldAppendTrace =
                isTraceLastParameter &&
                processedArguments.length === declarationParameters.length - 1

              const shouldTraceCall =
                signatureTags(signature)["ets_trace"]?.includes("call")

              return factory.updateCallExpression(
                node,
                shouldTraceCall
                  ? factory.createCallExpression(traceCallId, undefined, [
                      processedExpression,
                      trace
                    ])
                  : processedExpression,
                node.typeArguments,
                shouldAppendTrace ? [...processedArguments, trace] : processedArguments
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        if (tracingOn && !isDisabledEverywhere) {
          return ts.visitNode(sourceFile, visitor)
        }

        return sourceFile
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
    if (entry[1] && entry[1][0]) {
      tags[entry[0]!]!.push(entry[1][0].text)
    }
  }
  return tags
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
