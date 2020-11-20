import * as ts from "typescript"

export interface MyPluginOptions {
  some?: string
}

const support = {
  Effect: {
    reg: /\/\/ trace :: (.*?) -> Effect/,
    top: ["tuple"],
    end: ["succeed", "chain", "chain_", "map", "map_", "andThen", "andThen_"]
  }
}

export default function myTransformerPlugin(
  _program: ts.Program,
  _opts: MyPluginOptions
) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        let effectVar: string | undefined = undefined
        let context: keyof typeof support | undefined = undefined

        for (const k of Object.keys(support) as (keyof typeof support)[]) {
          const match = support[k].reg.exec(sourceFile.getFullText())
          if (match) {
            effectVar = match[1]
            context = k
          }
        }

        const factory = ctx.factory

        function visitor(node: ts.Node): ts.Node {
          if (
            effectVar &&
            context &&
            ts.isCallExpression(node) &&
            node.expression.getText().startsWith(`${effectVar}.`)
          ) {
            const { character, line } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart()
            )
            const supportedEnd = support[context].end
            const supportedTop = support[context].top
            const methodsEnd = supportedEnd.map((s) => `${effectVar}.${s}`)
            const methodsTop = supportedTop.map((s) => `${effectVar}.${s}`)
            const text = node.expression.getText()

            const iEnd = methodsEnd.findIndex((s) => s === text)

            if (iEnd !== -1) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier(effectVar),
                    factory.createIdentifier(supportedEnd[iEnd])
                  ),
                  node.typeArguments,
                  [
                    ...node.arguments,
                    factory.createStringLiteral(
                      `${sourceFile.fileName}:${line + 1}:${character + 1}:${context}:${
                        supportedEnd[iEnd]
                      }`
                    )
                  ]
                ),
                visitor,
                ctx
              )
            }

            const iTop = methodsTop.findIndex((s) => s === text)

            if (iTop !== -1) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier(effectVar),
                    factory.createIdentifier(supportedTop[iTop])
                  ),
                  node.typeArguments,
                  [
                    factory.createStringLiteral(
                      `${sourceFile.fileName}:${line + 1}:${character + 1}:${context}:${
                        supportedTop[iTop]
                      }`
                    ),
                    ...node.arguments
                  ]
                ),
                visitor,
                ctx
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
