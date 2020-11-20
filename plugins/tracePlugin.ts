import * as ts from "typescript"

export interface TracingOptions {
  tracingFactory: string
}

export const traceRegex = /\/\/ trace: on/

export default function tracingPlugin(_program: ts.Program, _opts: TracingOptions) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        const checker = _program.getTypeChecker()

        const factory = ctx.factory

        const tracingEnabled = traceRegex.test(sourceFile.getFullText())

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
              const name = _opts.tracingFactory || "T"
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
                        factory.createIdentifier(name),
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
        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}
