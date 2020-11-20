import * as ts from "typescript"

export interface MyPluginOptions {
  some?: string
}

const support = {
  Effect: {
    reg: /\/\/ trace :: (.*?) -> Effect/,
    fns: {
      map: [0],
      bimap: [0, 1]
    }
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
            const text = node.expression.getText()
            const method = text.substr(effectVar.length + 1)

            if (support[context].fns[method]) {
              const replace = support[context].fns[method] as number[]
              const v = effectVar
              return factory.createCallExpression(
                node.expression,
                node.typeArguments,
                node.arguments.map((x, i) => {
                  if (replace.includes(i)) {
                    const {
                      character,
                      line
                    } = sourceFile.getLineAndCharacterOfPosition(
                      node.arguments[i].getStart()
                    )

                    return factory.createCallExpression(
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier(v),
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
