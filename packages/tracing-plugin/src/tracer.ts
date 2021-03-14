import * as path from "path"
import ts from "typescript"

import { getCallExpressionMetadata, getMetadataTagValues } from "./utils"

interface ParsedTraceSyntax {
  methodExpression: ts.Expression
  arguments: ts.NodeArray<ts.Expression>
  traceArgumentIndex: number
  shouldTraceCall: boolean
}

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

      function getSourceFilePathForTrace(sourceFile: ts.SourceFile) {
        // get the relative file name, and apply module regexp
        let finalName = path.relative(process.cwd(), sourceFile.fileName)
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
        return finalName
      }

      function getTraceForNode(
        node: ts.Node,
        sourceFile: ts.SourceFile,
        fileNameIdentifier: ts.Expression
      ) {
        const traceLineAndCharacterPos = sourceFile.getLineAndCharacterOfPosition(
          node.getEnd()
        )
        // builds fileName + ":12:48"
        return factory.createBinaryExpression(
          fileNameIdentifier,
          factory.createToken(ts.SyntaxKind.PlusToken),
          factory.createStringLiteral(
            `:${traceLineAndCharacterPos.line + 1}:${
              traceLineAndCharacterPos.character + 1
            }`
          )
        )
      }

      function parseTraceSyntax(
        node: ts.Node,
        sourceFile: ts.SourceFile
      ): ParsedTraceSyntax | undefined {
        if (ts.isCallExpression(node)) {
          const metadata = getCallExpressionMetadata(checker, node, sourceFile)

          // is there a __trace argument?
          const { traceArgumentIndex } = metadata
          // should use traceCall(f, trace)(args)?
          const shouldTraceCall = getMetadataTagValues(metadata, "trace").has("call")
          // if any of before, this is parsed
          if (traceArgumentIndex !== -1 || shouldTraceCall) {
            return {
              traceArgumentIndex,
              shouldTraceCall,
              methodExpression: node.expression,
              arguments: node.arguments
            }
          }
        }
        return undefined
      }

      function applyTraceSyntax(
        node: ts.Node,
        sourceFile: ts.SourceFile,
        fileNameIdentifier: ts.Expression,
        traceCallIdentifier: ts.Expression,
        parsedInfo: ParsedTraceSyntax
      ): ts.VisitResult<ts.Node> {
        const trace = getTraceForNode(
          parsedInfo.methodExpression,
          sourceFile,
          fileNameIdentifier
        )
        let callExpression = parsedInfo.methodExpression
        let callArguments = parsedInfo.arguments

        // replace the argument __trace, usually at the end
        if (parsedInfo.traceArgumentIndex !== -1) {
          callArguments = factory.createNodeArray(
            callArguments
              .slice(0, parsedInfo.traceArgumentIndex)
              .concat([trace])
              .concat(callArguments.slice(parsedInfo.traceArgumentIndex + 1))
          )
        }

        // wraps f(args) to traceCall(f, trace)(args) if needed
        if (parsedInfo.shouldTraceCall) {
          callExpression = ts.setOriginalNode(
            ts.setTextRange(
              factory.createCallExpression(traceCallIdentifier, undefined, [
                callExpression,
                trace
              ]),
              callExpression
            ),
            callExpression
          )
        }

        // replace the original call expression with the new one
        return ts.setOriginalNode(
          ts.setTextRange(
            factory.createCallExpression(callExpression, undefined, callArguments),
            node
          ),
          node
        )
      }

      function getTracedRegions(sourceFile: ts.SourceFile) {
        return sourceFile
          .getFullText()
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
      }

      return (sourceFile: ts.SourceFile) => {
        // collect regions where tracing is enabled/disabled
        const tracedRegions = getTracedRegions(sourceFile)

        const traceCallName = factory.createIdentifier("traceCall")
        const fileNameVarName = factory.createUniqueName("fileName")
        const tracingModuleName = factory.createUniqueName("tracing")

        const traceCallIdentifier = factory.createPropertyAccessExpression(
          tracingModuleName,
          traceCallName
        )

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          // is this a fake node?
          if (node.getEnd() < 0) return ts.visitEachChild(node, visitor, ctx)

          // checks if this region should be traced
          const nodeLineAndCharacter = sourceFile.getLineAndCharacterOfPosition(
            node.getEnd()
          )
          const isRegionTraced = checkRegionAt(
            tracedRegions,
            nodeLineAndCharacter.line,
            nodeLineAndCharacter.character
          )

          if (!tracingOn || !isRegionTraced)
            return ts.visitEachChild(node, visitor, ctx)

          // parse and eventually process found
          const parsedInfo = parseTraceSyntax(node, sourceFile)
          if (parsedInfo) {
            // NOTE: avoid calling visitEachChild on transformed node since it may loop itself
            parsedInfo.methodExpression = ts.visitNode(
              parsedInfo.methodExpression,
              visitor
            )
            parsedInfo.arguments = ts.visitNodes(parsedInfo.arguments, visitor)
            return applyTraceSyntax(
              node,
              sourceFile,
              fileNameVarName,
              traceCallIdentifier,
              parsedInfo
            )
          }

          // continue
          return ts.visitEachChild(node, visitor, ctx)
        }

        // if tracing is disabled, early exit
        if (!tracingOn) return sourceFile

        // prepend the import statement from utils
        const tracedSourceFile = ts.visitEachChild(sourceFile, visitor, ctx)
        const fileName = getSourceFilePathForTrace(sourceFile)
        const newSourceFile = factory.updateSourceFile(sourceFile, [
          factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamespaceImport(tracingModuleName)
            ),
            factory.createStringLiteral("@effect-ts/tracing-utils")
          ),
          factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  fileNameVarName,
                  undefined,
                  undefined,
                  factory.createStringLiteral(fileName)
                )
              ],
              ts.NodeFlags.Const
            )
          ),
          ...tracedSourceFile.statements
        ])

        return ts.setOriginalNode(
          ts.setTextRange(newSourceFile, sourceFile),
          sourceFile
        )
      }
    }
  }
}
