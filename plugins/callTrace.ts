// import * as path from "path"
import * as ts from "typescript"

class RefCounted<A> {
  private counter = 0
  constructor(readonly ref: A) {}
  get get() {
    this.counter++
    return this.ref
  }
  get count() {
    return this.counter
  }
}

export default function callTrace(_: ts.Program) {
  const checker = _.getTypeChecker()
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        if (sourceFile.isDeclarationFile) {
          return sourceFile
        }

        const tracer = new RefCounted(ctx.factory.createUniqueName("tracer"))
        const fileName = new RefCounted(ctx.factory.createUniqueName("fileName"))

        function getOriginal(node: ts.Node): ts.Node {
          if ("original" in node) {
            return getOriginal(node["original"] as ts.Node)
          }
          return node
        }

        function getTrace(node: ts.Node) {
          try {
            const pos = getOriginal(node).getStart()
            const nodeEnd = sourceFile.getLineAndCharacterOfPosition(pos)
            return ctx.factory.createBinaryExpression(
              fileName.get,
              ctx.factory.createToken(ts.SyntaxKind.PlusToken),
              ctx.factory.createStringLiteral(`:${nodeEnd.line + 1}:${nodeEnd.character + 1}`)
            )
          } catch (e) {
            return undefined
          }
        }

        const visitor = (node: ts.Node): ts.Node => {
          const visited = ts.visitEachChild(node, visitor, ctx)

          if (ts.isCallExpression(visited)) {
            let shouldEmbedTrace = false
            const signature = checker.getResolvedSignature(visited)
            const declaration = signature?.declaration

            if (declaration) {
              shouldEmbedTrace = ts.getAllJSDocTags(
                declaration,
                (tag): tag is ts.JSDocTag =>
                  tag.tagName.text === "effect" && tag.comment === "traced"
              ).length > 0
            }

            if (!shouldEmbedTrace) {
              shouldEmbedTrace =
                (checker.getSymbolAtLocation(visited.expression)?.getJsDocTags(checker)
                  .filter((tag) =>
                    tag.name === "effect" && tag.text &&
                    tag.text.map((d) => d.text).join("\n") === "traced"
                  ) || []).length > 0
            }

            if (shouldEmbedTrace) {
              const trace = getTrace(visited)
              if (typeof trace !== "undefined") {
                return ctx.factory.createCallExpression(
                  ctx.factory.createCallExpression(
                    ctx.factory.createPropertyAccessExpression(tracer.get, "withCallTrace"),
                    [],
                    [trace]
                  ),
                  [],
                  [visited]
                )
              }
            }
          }

          return visited
        }

        const visited = ts.visitNode(sourceFile, visitor)

        const statements: ts.Statement[] = []

        if (tracer.count > 0) {
          statements.push(ctx.factory.createImportDeclaration(
            undefined,
            ctx.factory.createImportClause(
              false,
              undefined,
              ctx.factory.createNamespaceImport(tracer.get)
            ),
            ctx.factory.createStringLiteral("@effect/core/io/Effect/definition/primitives")
          ))
        }

        if (fileName.count > 0) {
          statements.push(ctx.factory.createVariableStatement(
            undefined,
            ctx.factory.createVariableDeclarationList(
              [
                ctx.factory.createVariableDeclaration(
                  fileName.get,
                  undefined,
                  undefined,
                  ctx.factory.createStringLiteral(sourceFile.fileName)
                )
              ],
              ts.NodeFlags.Const
            )
          ))
        }

        for (const statement of visited.statements) {
          statements.push(statement)
        }

        return ctx.factory.updateSourceFile(
          visited,
          statements,
          visited.isDeclarationFile,
          visited.referencedFiles,
          visited.typeReferenceDirectives,
          visited.hasNoDefaultLib,
          visited.libReferenceDirectives
        )
      }
    }
  }
}
