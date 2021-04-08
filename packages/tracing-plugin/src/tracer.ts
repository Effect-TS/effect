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

function normalize(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path) // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return path
  }

  return path.replace(/\\/g, "/")
}

export default function tracer(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    moduleMap?: Record<string, string>
    __importTracingFrom?: string
  }
) {
  const tracingOn = !(_opts?.tracing === false)
  const checker = _program.getTypeChecker()

  const moduleMap = _opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  const programDir = _program.getCurrentDirectory()
  const importTracingFrom = _opts?.__importTracingFrom ?? "@effect-ts/core/Tracing"

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const traceCall = factory.createIdentifier("traceCall")
        const traceCallLast = factory.createIdentifier("traceCallLast")
        const fileVar = factory.createUniqueName("fileName")
        const tracing = factory.createUniqueName("tracing")

        const isModule =
          sourceFile.statements.find((s) => ts.isImportDeclaration(s)) != null

        if (!isModule) {
          return sourceFile
        }

        const traceCallId = factory.createPropertyAccessExpression(tracing, traceCall)
        const traceCallLastId = factory.createPropertyAccessExpression(
          tracing,
          traceCallLast
        )

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
          if (ts.isFunctionDeclaration(node)) {
            const tags = ts
              .getJSDocTags(node)
              .map((tag) => `${tag.tagName.escapedText} ${tag.comment}`)

            if (tags.includes("trace off")) {
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

              const shouldTraceCall = signatureTags(signature)["trace"]?.includes(
                "call"
              )

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
                factory.createStringLiteral(normalize(finalName))
              )
            ],
            ts.NodeFlags.Const
          )
        )

        const isDisabledEverywhere =
          regions.length > 0 && regions.every(([rs]) => rs.every(([_]) => !_))

        function fixRelative(path: string) {
          if (path.startsWith(".")) {
            return path
          }
          return `./${path}`
        }

        if (tracingOn && !isDisabledEverywhere) {
          const visited = ts.visitNode(sourceFile, visitor)
          const importPath = importTracingFrom.startsWith(".")
            ? fixRelative(
                path.relative(
                  path.dirname(sourceFile.fileName),
                  path.join(programDir, importTracingFrom)
                )
              ) || "."
            : importTracingFrom

          return factory.updateSourceFile(visited, [
            factory.createImportDeclaration(
              undefined,
              undefined,
              factory.createImportClause(
                false,
                undefined,
                factory.createNamespaceImport(tracing)
              ),
              factory.createStringLiteral(importPath)
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

function signatureTags(signature: ts.Signature | undefined) {
  const tags: Record<string, (string | undefined)[]> = {}

  for (const entry of signature?.getJsDocTags().map((t) => [t.name, t.text] as const) ||
    []) {
    if (!tags[entry[0]]) {
      tags[entry[0]] = []
    }
    tags[entry[0]!]!.push(entry[1])
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
