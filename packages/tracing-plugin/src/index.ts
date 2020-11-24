import * as path from "path"
import * as ts from "typescript"

function checkRegionAt(
  regions: (readonly [[boolean, number][], number])[],
  line: number,
  char: number
) {
  const previous = regions.filter(([_, __]) => __ <= line)
  const last = previous[previous.length - 1]
  let on = false

  if (last) {
    if (last[1] === line) {
      const prevInLine = last[0].filter(([_, c]) => c <= char)

      if (prevInLine.length > 0) {
        on = prevInLine[prevInLine.length - 1][0]
      }
    } else {
      const prevOfAll = last[0]

      if (prevOfAll.length > 0) {
        on = prevOfAll[prevOfAll.length - 1][0]
      }
    }
  }

  return on
}

const traceRegex = /tracing: (on|off)/
const traceOnRegex = /tracing: on/

export default function tracer(
  _program: ts.Program,
  _opts?: { tracing?: boolean; pipe?: boolean; flow?: boolean; identity?: boolean }
) {
  const tracingOn = !(_opts?.tracing === false)
  const pipeOn = !(_opts?.pipe === false)
  const identityOn = !(_opts?.identity === false)
  const flowOn = !(_opts?.flow === false)
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory
      return (sourceFile: ts.SourceFile) => {
        const sourceFullText = sourceFile.getFullText()
        const traceF = factory.createUniqueName("trace")

        const tracingEnabled = traceOnRegex.test(sourceFile.getFullText()) && tracingOn

        const regions = sourceFullText
          .split("\n")
          .map((line, i) => {
            const x: [boolean, number][] = []
            const m = line.matchAll(traceRegex)
            for (const k of m) {
              if (k && k.index) {
                x.push([k[1] === "on", k.index])
              }
            }
            return [x, i] as const
          })
          .filter(([x]) => x.length > 0)

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart())
          const isTracing =
            tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)

          if (ts.isCallExpression(node)) {
            const symbol = checker.getTypeAtLocation(node.expression).getSymbol()

            const overloadDeclarations = checker
              .getResolvedSignature(node)
              ?.getDeclaration()

            const optimizeTagsOverload = overloadDeclarations
              ? (() => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "optimize"
                      )
                      .map((e) => e.comment)
                      .filter((s): s is string => s != null)
                  } catch {
                    return undefined
                  }
                })()
              : undefined

            const optimizeTagsMain =
              symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName?.getText() === "optimize"
                      )
                      .map((e) => e.comment)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            const optimizeTags = new Set([
              ...optimizeTagsMain,
              ...(optimizeTagsOverload || [])
            ])

            const noTraceRetTagsOverload = overloadDeclarations
              ? ts
                  .getAllJSDocTags(
                    overloadDeclarations,
                    (t): t is ts.JSDocTag => t.tagName.getText() === "notraceret"
                  )
                  .map((e) => e.comment)
                  .filter((s): s is string => s != null)
              : undefined

            const noTraceRetTagsMain =
              symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "notraceret"
                      )
                      .map((e) => e.comment)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            const noTraceRetTags = new Set([
              ...noTraceRetTagsMain,
              ...(noTraceRetTagsOverload || [])
            ])

            const cs = checker
              .getResolvedSignature(node)
              ?.getReturnType()
              ?.getCallSignatures()

            const shouldTrace =
              noTraceRetTags.size === 0 && cs && cs.length > 0 && isTracing

            if (
              identityOn &&
              optimizeTags.has("identity") &&
              node.arguments.length === 1 &&
              !ts.isSpreadElement(node.arguments[0])
            ) {
              return ts.visitEachChild(node, visitor, ctx).arguments[0]
            }

            if (pipeOn && optimizeTags.has("pipe")) {
              if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                return optimisePipe(
                  ts.visitEachChild(node, visitor, ctx).arguments,
                  factory
                )
              }
            }

            if (flowOn && optimizeTags.has("flow")) {
              const id = factory.createIdentifier("args")

              if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                return shouldTrace
                  ? factory.createCallExpression(traceF, undefined, [
                      factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                          factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createToken(ts.SyntaxKind.DotDotDotToken),
                            id,
                            undefined,
                            undefined,
                            undefined
                          )
                        ],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        optimiseFlow(
                          ts.visitEachChild(node, visitor, ctx).arguments,
                          factory,
                          id
                        )
                      ),
                      factory.createStringLiteral(
                        `:${nodeStart.line + 1}:${nodeStart.character + 1}:${
                          ts.isVariableDeclaration(node.parent)
                            ? node.parent.name.getText()
                            : ts.isPropertyDeclaration(node.parent)
                            ? node.parent.name.getText()
                            : "anonymous"
                        }`
                      )
                    ])
                  : factory.createArrowFunction(
                      undefined,
                      undefined,
                      [
                        factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          factory.createToken(ts.SyntaxKind.DotDotDotToken),
                          id,
                          undefined,
                          undefined,
                          undefined
                        )
                      ],
                      undefined,
                      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                      optimiseFlow(
                        ts.visitEachChild(node, visitor, ctx).arguments,
                        factory,
                        id
                      )
                    )
              }
            }

            if (shouldTrace) {
              return factory.createCallExpression(traceF, undefined, [
                ts.visitEachChild(node, visitor, ctx),
                factory.createStringLiteral(
                  `:${nodeStart.line + 1}:${nodeStart.character + 1}:${
                    ts.isVariableDeclaration(node.parent)
                      ? node.parent.name.getText()
                      : ts.isPropertyDeclaration(node.parent)
                      ? node.parent.name.getText()
                      : "anonymous"
                  }`
                )
              ])
            }
          }

          if (isTracing) {
            if (ts.isClassDeclaration(node) && node.name) {
              const members: [ts.Identifier, ts.StringLiteral][] = []

              node.members.forEach((m) => {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  m.getStart()
                )
                if (m.name && ts.isIdentifier(m.name) && ts.isMethodDeclaration(m)) {
                  members.push([
                    m.name,
                    factory.createStringLiteral(
                      `:${line + 1}:${
                        character + 1 + m.name.getText().length
                      }:${m.name.getText()}`
                    )
                  ])
                }
              })

              const name = node.name

              return [
                ts.visitEachChild(node, visitor, ctx),
                factory.createCallExpression(traceF, undefined, [
                  name,
                  factory.createStringLiteral(
                    `:${nodeStart.line + 1}:${
                      nodeStart.character +
                      7 +
                      name.getText().length +
                      (node.getFirstToken()?.getText() === "export" ? 7 : 0)
                    }:${name.getText()}`
                  )
                ]),
                ...members.map(([id, trace]) =>
                  factory.createCallExpression(traceF, undefined, [
                    factory.createElementAccessExpression(
                      factory.createPropertyAccessExpression(
                        name,
                        factory.createIdentifier("prototype")
                      ),
                      factory.createStringLiteral(id.getText())
                    ),
                    trace
                  ])
                )
              ]
            }

            if (ts.isArrowFunction(node)) {
              const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                node.body?.getStart() || node.getStart()
              )

              return factory.createCallExpression(traceF, undefined, [
                ts.visitEachChild(node, visitor, ctx),
                factory.createStringLiteral(
                  `:${line + 1}:${character + 1}:${
                    ts.isVariableDeclaration(node.parent)
                      ? node.parent.name.getText()
                      : ts.isPropertyDeclaration(node.parent)
                      ? node.parent.name.getText()
                      : "anonymous"
                  }`
                )
              ])
            }
            if (ts.isFunctionExpression(node)) {
              const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                node.body?.getStart() || node.getStart()
              )

              return factory.createCallExpression(traceF, undefined, [
                ts.visitEachChild(node, visitor, ctx),
                factory.createStringLiteral(
                  `:${line + 1}:${character + 1}:${
                    node.name?.getText() ||
                    (ts.isVariableDeclaration(node.parent)
                      ? node.parent.name.getText()
                      : "anonymous")
                  }`
                )
              ])
            }
            if (ts.isFunctionDeclaration(node)) {
              const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                node.body?.getStart() || node.getStart()
              )
              const name = node.name

              if (name) {
                return [
                  ts.visitEachChild(node, visitor, ctx),
                  factory.createCallExpression(traceF, undefined, [
                    name,
                    factory.createStringLiteral(
                      `:${line + 1}:${character + 1}:${name.getText()}`
                    )
                  ])
                ]
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        const { fileName } = sourceFile

        const traceFNode = factory.createFunctionDeclaration(
          undefined,
          undefined,
          undefined,
          traceF,
          undefined,
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              factory.createIdentifier("f"),
              undefined,
              undefined,
              undefined
            ),
            factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              factory.createIdentifier("t"),
              undefined,
              undefined,
              undefined
            )
          ],
          undefined,
          factory.createBlock(
            [
              factory.createExpressionStatement(
                factory.createBinaryExpression(
                  factory.createElementAccessExpression(
                    factory.createIdentifier("f"),
                    factory.createStringLiteral("$trace")
                  ),
                  factory.createToken(ts.SyntaxKind.EqualsToken),
                  factory.createBinaryExpression(
                    factory.createStringLiteral(path.relative(process.cwd(), fileName)),
                    factory.createToken(ts.SyntaxKind.PlusToken),
                    factory.createIdentifier("t")
                  )
                )
              ),
              factory.createReturnStatement(factory.createIdentifier("f"))
            ],
            true
          )
        )

        if (tracingEnabled) {
          const visited = ts.visitEachChild(sourceFile, visitor, ctx)
          return factory.updateSourceFile(visited, [traceFNode, ...visited.statements])
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}

function optimisePipe(
  args: ArrayLike<ts.Expression>,
  factory: ts.NodeFactory
): ts.Expression {
  if (args.length === 1) {
    return args[0]
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [
    optimisePipe(newArgs, factory)
  ])
}

function optimiseFlow(
  args: ArrayLike<ts.Expression>,
  factory: ts.NodeFactory,
  x: ts.Identifier
): ts.Expression {
  if (args.length === 1) {
    return factory.createCallExpression(args[0], undefined, [x])
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [
    optimiseFlow(newArgs, factory, x)
  ])
}
