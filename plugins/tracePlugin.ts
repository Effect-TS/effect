import * as ts from "typescript"

export interface TracingOptions {
  tracingFactory?: string
  tracingModule?: string
}

export default function tracingPlugin(_program: ts.Program, _opts: TracingOptions) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        const checker = _program.getTypeChecker()
        let tracingModule = _opts.tracingModule || "@effect-ts/core/Tracing"
        const tracingFactory = _opts.tracingFactory || "__TRACER"

        const factory = ctx.factory

        const traceRegex = /\/\/ trace: on/
        const overrideRegex = /\/\/ tracingModule: (.*)/

        const tracingEnabled = traceRegex.test(sourceFile.getFullText())

        const overrideMatches = overrideRegex.exec(sourceFile.getFullText())

        if (overrideMatches) {
          tracingModule = overrideMatches[1]
        }

        function visitor(node: ts.Node): ts.Node {
          if (tracingEnabled && ts.isCallExpression(node)) {
            const symbol = checker.getSymbolAtLocation(node.expression)
            const argsToTrace =
              symbol
                ?.getDeclarations()
                ?.map((e) =>
                  ts
                    .getAllJSDocTags(
                      e,
                      (t): t is ts.JSDocTag => t.tagName.getText() === "trace"
                    )
                    .map((e) => e.comment)
                )
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            if (argsToTrace.length > 0) {
              const method =
                symbol
                  ?.getDeclarations()
                  ?.map((e) => ts.getNameOfDeclaration(e)?.getText())
                  .filter((name) => name && name?.length > 0)[0] || "unknown"
              const context =
                symbol
                  ?.getDeclarations()
                  ?.map((e) =>
                    ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "module"
                      )
                      .map((e) => e.comment)
                  )
                  .reduce((flatten, entry) => flatten.concat(entry), [])[0] || "unknown"

              return factory.createCallExpression(
                node.expression,
                node.typeArguments,
                node.arguments.map((x, i) => {
                  if (argsToTrace.includes("all") || argsToTrace.includes("" + i)) {
                    const {
                      character,
                      line
                    } = sourceFile.getLineAndCharacterOfPosition(
                      node.arguments[i].getStart()
                    )

                    return factory.createCallExpression(
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier(tracingFactory),
                        factory.createIdentifier("traceF_")
                      ),
                      undefined,
                      [
                        ts.visitEachChild(node.arguments[i], visitor, ctx),
                        factory.createStringLiteral(
                          `${sourceFile.fileName}:${line + 1}:${
                            character + 1
                          }:${context}:${method}`
                        )
                      ]
                    )
                  }
                  return ts.visitEachChild(x, visitor, ctx)
                })
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(
          tracingEnabled
            ? factory.updateSourceFile(sourceFile, [
                factory.createImportDeclaration(
                  undefined,
                  undefined,
                  factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamespaceImport(
                      factory.createIdentifier(tracingFactory)
                    )
                  ),
                  factory.createStringLiteral(tracingModule)
                ),
                ...sourceFile.statements
              ])
            : sourceFile,
          visitor,
          ctx
        )
      }
    }
  }
}
