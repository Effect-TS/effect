import * as path from "path"
import ts from "typescript"

import prepare from "./prepare"

function checkRegionAt(
  regions: (readonly [[boolean, number][], number])[],
  line: number,
  char: number
) {
  const previous = regions.filter(([_, __]) => __ <= line)
  const last = previous[previous.length - 1]
  let on = true

  if (last) {
    if (last[1] === line) {
      const prevInLine = last[0].filter(([_, c]) => c <= char)

      if (prevInLine.length > 0) {
        on = prevInLine[prevInLine.length - 1]![0]!
      }
    } else {
      const prevOfAll = last[0]

      if (prevOfAll.length > 0) {
        on = prevOfAll[prevOfAll.length - 1]![0]!
      }
    }
  }

  return on
}

export default function tracer(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    moduleMap?: Record<string, string>
  }
) {
  const tracingOn = !(_opts?.tracing === false)
  const checker = _program.getTypeChecker()

  const moduleMap = _opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const traced = factory.createIdentifier("traceCall")
        const fileVar = factory.createUniqueName("fileName")
        const tracing = factory.createUniqueName("tracing")

        const isModule =
          sourceFile.statements.find((s) => ts.isImportDeclaration(s)) != null

        if (!isModule) {
          return sourceFile
        }

        const tracedIdentifier = factory.createPropertyAccessExpression(tracing, traced)

        const { fileName } = sourceFile

        let finalName = path.relative(process.cwd(), fileName)

        function getTrace(node: ts.Node, pos: "start" | "end") {
          const nodeStart = sourceFile.getLineAndCharacterOfPosition(
            pos === "start" ? node.getStart() : node.getEnd()
          )
          return factory.createBinaryExpression(
            fileVar,
            factory.createToken(ts.SyntaxKind.PlusToken),
            factory.createStringLiteral(
              `:${nodeStart.line + 1}:${nodeStart.character + 1}`
            )
          )
        }

        const sourceFullText = sourceFile.getFullText()

        const regions = sourceFullText
          .split("\n")
          .map((line, i) => {
            const x: [boolean, number][] = []
            const m = line.matchAll(/tracing: (on|off)/g)
            for (const k of m) {
              if (k && k.index) {
                x.push([k[1] === "on", k.index])
              }
            }
            return [x, i] as const
          })
          .filter(([x]) => x.length > 0)

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            let isTracing: boolean

            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(
                node.expression.getStart()
              )

              isTracing =
                tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (isTracing) {
              const trace = getTrace(node.expression, "end")
              const signature = checker.getResolvedSignature(node)
              const declaration =
                signature?.getDeclaration() ?? getDeclaration(checker, node)

              const parameters = declaration?.parameters || []
              const traceLast =
                parameters.length > 0
                  ? parameters[parameters.length - 1]!.name.getText() === "__trace"
                  : false

              const entries: (readonly [string, string | undefined])[] =
                signature?.getJsDocTags().map((t) => [t.name, t.text] as const) || []
              const tags: Record<string, (string | undefined)[]> = {}

              for (const entry of entries) {
                if (!tags[entry[0]]) {
                  tags[entry[0]] = []
                }
                tags[entry[0]!]!.push(entry[1])
              }

              const traceCall = tags["trace"] && tags["trace"].includes("call")

              const argx = node.arguments.map((i) => ts.visitNode(i, visitor))

              const expr = ts.visitNode(node.expression, visitor)

              if (traceCall || traceLast) {
                const expression = traceCall
                  ? factory.createCallExpression(tracedIdentifier, undefined, [
                      expr,
                      trace
                    ])
                  : expr

                const args = traceLast ? [...argx, trace] : argx

                return factory.updateCallExpression(
                  node,
                  expression,
                  node.typeArguments,
                  args
                )
              } else {
                return factory.updateCallExpression(
                  node,
                  expr,
                  node.typeArguments,
                  argx
                )
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        for (const k of moduleMapKeys) {
          const matches = finalName.match(k[1]!)
          if (matches) {
            let patchedName = moduleMap[k[0]!]!
            for (let j = 1; j < matches.length; j += 1) {
              patchedName = patchedName.replace("$" + j, matches[j]!)
            }
            finalName = patchedName
            break
          }
        }

        const fileNode = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                fileVar,
                undefined,
                undefined,
                factory.createStringLiteral(finalName)
              )
            ],
            ts.NodeFlags.Const
          )
        )

        if (tracingOn) {
          const visited = ts.visitEachChild(
            prepare(_program).before(ctx)(sourceFile),
            visitor,
            ctx
          )

          return factory.updateSourceFile(visited, [
            factory.createImportDeclaration(
              undefined,
              undefined,
              factory.createImportClause(
                false,
                undefined,
                factory.createNamespaceImport(tracing)
              ),
              factory.createStringLiteral("@effect-ts/tracing-utils")
            ),
            fileNode,
            ...visited.statements
          ])
        }

        return sourceFile
      }
    }
  }
}

function getDeclaration(
  checker: ts.TypeChecker,
  node: ts.CallExpression
): ts.SignatureDeclaration | undefined {
  const ds = checker
    .getTypeAtLocation(node.expression)
    .getCallSignatures()
    .map((s) => s.getDeclaration())
  if (ds?.length !== 1) {
    return undefined
  }
  return ds?.[0]
}
