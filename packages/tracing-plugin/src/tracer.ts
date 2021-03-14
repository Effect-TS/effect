import * as path from "path"
import ts from "typescript"

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

        function getTrace(node: ts.Node) {
          const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
          return factory.createBinaryExpression(
            fileVar,
            factory.createToken(ts.SyntaxKind.PlusToken),
            factory.createStringLiteral(`:${nodeEnd.line + 1}:${nodeEnd.character + 1}`)
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

              let expression = ts.visitNode(node.expression, visitor)
              let args = node.arguments.map((x) => ts.visitNode(x, visitor))

              if (traceCall || traceLast) {
                expression = traceCall
                  ? factory.createCallExpression(tracedIdentifier, undefined, [
                      expression,
                      trace
                    ])
                  : expression

                args = traceLast ? [...args, trace] : args

                return factory.updateCallExpression(
                  node,
                  expression,
                  node.typeArguments,
                  args
                )
              } else {
                return factory.updateCallExpression(
                  node,
                  expression,
                  node.typeArguments,
                  args
                )
              }
            }
          } else if (ts.isPropertyAccessExpression(node)) {
            let isTracing: boolean

            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getEnd())

              isTracing =
                tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (isTracing) {
              const ds = checker
                .getTypeAtLocation(node)
                .getCallSignatures()
                .flatMap((s) => s.getJsDocTags())
                .map((tag) => `${tag.name} ${tag.text}`)

              if (ds.includes("trace call")) {
                return factory.createCallExpression(tracedIdentifier, undefined, [
                  node,
                  getTrace(node)
                ])
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

        const disabledAllFile =
          regions.length > 0 && regions.every(([rs]) => rs.every(([_]) => !_))

        if (tracingOn && !disabledAllFile) {
          const visited = ts.visitNode(sourceFile, visitor)

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
