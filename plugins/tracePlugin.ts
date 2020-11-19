import * as ts from "typescript"

export interface MyPluginOptions {
  some?: string
}

const effectModuleRegex = /\/\/ trace :: (.*?) -> Effect/

export default function myTransformerPlugin(
  _program: ts.Program,
  _opts: MyPluginOptions
) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        let effectVar: string | undefined = undefined
        const EffectMatches = effectModuleRegex.exec(sourceFile.getFullText())

        if (EffectMatches) {
          effectVar = EffectMatches[1]
        }

        const factory = ctx.factory

        function visitor(node: ts.Node): ts.Node {
          if (
            effectVar &&
            ts.isCallExpression(node) &&
            node.expression.getText().startsWith(`${effectVar}.`)
          ) {
            const { character, line } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart()
            )
            const supportedEnd = ["succeed", "chain", "map"]
            const supportedTop = ["tuple"]
            const methodsEnd = supportedEnd.map((s) => `${effectVar}.${s}`)
            const methodsTop = supportedTop.map((s) => `${effectVar}.${s}`)
            const text = node.expression.getText()

            const iEnd = methodsEnd.findIndex((s) => s === text)

            if (iEnd !== -1) {
              return factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(effectVar),
                  factory.createIdentifier(supportedEnd[iEnd])
                ),
                node.typeArguments,
                [
                  ...node.arguments,
                  factory.createStringLiteral(
                    `${sourceFile.fileName}:${line + 1}:${character + 1}`
                  )
                ]
              )
            }

            const iTop = methodsTop.findIndex((s) => s === text)

            if (iTop !== -1) {
              return factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(effectVar),
                  factory.createIdentifier(supportedTop[iTop])
                ),
                node.typeArguments,
                [
                  factory.createStringLiteral(
                    `${sourceFile.fileName}:${line + 1}:${character + 1}`
                  ),
                  ...node.arguments
                ]
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
