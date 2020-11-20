import * as ts from "typescript"

export interface TracingOptions {}

export const traceRegex = /\/\/ trace: on/

export default function tracingPlugin(_program: ts.Program, _opts: TracingOptions) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        const checker = _program.getTypeChecker()
        const autoConfig = {} as Record<
          string,
          { name: string; context: string; trace: number[] }
        >

        const factory = ctx.factory

        const tracingEnabled = traceRegex.test(sourceFile.getFullText())

        function visitor(node: ts.Node): ts.Node {
          if (ts.isImportDeclaration(node) && tracingEnabled) {
            const clauses = node.importClause
            const namedImport = clauses?.getChildAt(0)

            if (namedImport && ts.isNamespaceImport(namedImport)) {
              const type = checker.getTypeAtLocation(namedImport)
              const sym = type.getSymbol()
              const matches: string[] = []
              if (sym) {
                sym.declarations.forEach((d) => {
                  const traceConfigRegex = new RegExp(`// traceConfig: (.*)`, "gm")
                  let match = traceConfigRegex.exec(d.getText())
                  while (match != null) {
                    matches.push(match[1])
                    match = traceConfigRegex.exec(d.getText())
                  }
                })
              }
              const nameImportParts = namedImport.getText().split(" ")
              const name = nameImportParts[nameImportParts.length - 1]

              console.log(matches)

              matches.forEach((s) => {
                const parts = s.split(" ")

                const context = parts[0]
                const fn = parts[1]
                const trace = JSON.parse(parts[2])

                autoConfig[`${name}.${fn}`] = {
                  name,
                  context,
                  trace
                }
              })
            }
          }

          if (ts.isCallExpression(node)) {
            const localText = node.expression.getText()
            const localConfig = autoConfig[localText]

            if (localConfig && localText !== "hasOwnProperty") {
              const { context, name, trace } = localConfig

              const text = node.expression.getText()
              const method = text.substr(name.length + 1)

              return factory.createCallExpression(
                node.expression,
                node.typeArguments,
                node.arguments.map((x, i) => {
                  if (trace.includes(i)) {
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
