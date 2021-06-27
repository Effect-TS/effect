import * as path from "path"
import ts from "typescript"

import dataFirst from "./dataFirst"
import identity from "./identity"
import rewrite from "./rewrite"
import type { Config } from "./shared"
import tracer from "./tracer"
import unpipe from "./unpipe"

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

export default function bundle(
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

  const B0 = {
    rewrite: rewrite(_program),
    dataFirst: dataFirst(_program),
    identity: identity(_program),
    tracer: tracer(_program),
    unpipe: unpipe(_program)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      const B1 = {
        rewrite: B0.rewrite.before(ctx),
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unpipe: B0.unpipe.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const mods = new Map<string, ts.Identifier>()

        const traceCallLast = factory.createIdentifier("traceCallLast")
        const fileVar = factory.createUniqueName("fileName")
        const tracing = factory.createUniqueName("tracing")
        const traceCall = factory.createIdentifier("traceCall")
        const traceCallId = factory.createPropertyAccessExpression(tracing, traceCall)

        const isModule =
          sourceFile.statements.find((s) => ts.isImportDeclaration(s)) != null

        if (!isModule) {
          return sourceFile
        }

        const traceCallLastId = factory.createPropertyAccessExpression(
          tracing,
          traceCallLast
        )

        const { fileName } = sourceFile

        let finalName = path.relative(process.cwd(), fileName)

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

        const isDisabledEverywhere =
          regions.length > 0 && regions.every(([rs]) => rs.every(([_]) => !_))

        const config: Config = {
          tracingOn,
          checker,
          moduleMapKeys,
          programDir,
          importTracingFrom,
          moduleMap,
          mods,
          traceCallLast,
          traceCallId,
          fileVar,
          tracing,
          isModule,
          traceCallLastId,
          fileName,
          getTrace,
          sourceFullText,
          regions,
          finalName,
          normalize,
          checkRegionAt,
          factory,
          traceCall,
          isDisabledEverywhere
        }

        const rewrite = B1.rewrite(sourceFile, config)
        const unpiped = B1.unpipe(rewrite)
        const traced = B1.tracer(unpiped, config)
        const unid = B1.identity(traced)
        const visited = B1.dataFirst(unid)

        const pre = [] as ts.Statement[]

        function fixRelative(path: string) {
          if (path.startsWith(".")) {
            return path
          }
          return `./${path}`
        }

        if (tracingOn && !isDisabledEverywhere) {
          const importPath = importTracingFrom.startsWith(".")
            ? fixRelative(
                path.relative(
                  path.dirname(sourceFile.fileName),
                  path.join(programDir, importTracingFrom)
                )
              ) || "."
            : importTracingFrom

          pre.push(
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
            factory.createVariableStatement(
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
          )
        }

        const imports = Array.from(mods).map(([mod, id]) =>
          factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamespaceImport(id)
            ),
            factory.createStringLiteral(mod)
          )
        )

        return factory.updateSourceFile(visited, [
          ...pre,
          ...imports,
          ...visited.statements
        ])
      }
    }
  }
}
