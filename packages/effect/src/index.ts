import * as path from "path"
import * as ts from "typescript"

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

export default function tracer(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    pipe?: boolean
    flow?: boolean
    identity?: boolean
    dataFirst?: boolean
    moduleMap?: Record<string, string>
  }
) {
  const tracingOn = !(_opts?.tracing === false)
  const pipeOn = !(_opts?.pipe === false)
  const identityOn = !(_opts?.identity === false)
  const flowOn = !(_opts?.flow === false)
  const dataFirstOn = !(_opts?.dataFirst === false)
  const checker = _program.getTypeChecker()

  const moduleMap = _opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const sourceFullText = sourceFile.getFullText()
        const traceF = factory.createUniqueName("trace")
        const traced = new Set<string>()
        const fileVar = factory.createUniqueName("fileName")
        const traceVar = factory.createUniqueName("$trace")

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

        function dataFirst(node: ts.Node): ts.VisitResult<ts.Node> {
          if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            node.arguments.length === 1 &&
            !ts.isSpreadElement(node.arguments[0])
          ) {
            const symbol = checker
              .getTypeAtLocation(node.expression.expression)
              .getSymbol()

            const dataFirstTag = symbol
              ?.getDeclarations()
              ?.map((e) => {
                try {
                  return ts
                    .getAllJSDocTags(
                      e,
                      (t): t is ts.JSDocTag => t.tagName?.getText() === "dataFirst"
                    )
                    .map((e) => e.comment)
                } catch {
                  return []
                }
              })
              .reduce((flatten, entry) => flatten.concat(entry), [])[0]

            if (dataFirstTag) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    node.expression.expression.expression,
                    factory.createIdentifier(dataFirstTag)
                  ),
                  undefined,
                  [node.arguments[0], ...node.expression.arguments]
                ),
                dataFirst,
                ctx
              )
            }
          }

          return ts.visitEachChild(node, dataFirst, ctx)
        }

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

            const traceRetTagsOverload = overloadDeclarations
              ? (() => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "traceret"
                      )
                      .map((e) => e.comment)
                      .filter((s): s is string => s != null)
                  } catch {
                    return undefined
                  }
                })()
              : undefined

            const traceRetTagsMain =
              symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "traceret"
                      )
                      .map((e) => e.comment)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            const traceRetTags = new Set([
              ...traceRetTagsMain,
              ...(traceRetTagsOverload || [])
            ])

            const shouldTrace = traceRetTags.size > 0 && isTracing

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
                          factory.createSpreadElement(id)
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
                        factory.createSpreadElement(id)
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

          if (ts.isClassDeclaration(node) && node.name) {
            if (isTracing) {
              const members: [ts.Identifier, ts.StringLiteral][] = []

              node.members
                .filter((t) => !ts.isConstructorDeclaration(t))
                .forEach((m) => {
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

              const cl = ts.visitEachChild(node, visitor, ctx)

              return factory.createClassDeclaration(
                cl.decorators,
                cl.modifiers,
                cl.name,
                cl.typeParameters,
                cl.heritageClauses,
                cl.members.map((m) => {
                  if (ts.isConstructorDeclaration(m) && m.body) {
                    return factory.updateConstructorDeclaration(
                      m,
                      m.decorators,
                      m.modifiers,
                      m.parameters,
                      factory.updateBlock(m.body, [
                        ...m.body.statements,
                        ...members.map(([id, trace]) => {
                          return factory.createExpressionStatement(
                            factory.createBinaryExpression(
                              factory.createElementAccessExpression(
                                factory.createPropertyAccessExpression(
                                  factory.createThis(),
                                  id
                                ),
                                traceVar
                              ),
                              factory.createToken(ts.SyntaxKind.EqualsToken),
                              factory.createBinaryExpression(
                                fileVar,
                                factory.createToken(ts.SyntaxKind.PlusToken),
                                trace
                              )
                            )
                          )
                        })
                      ])
                    )
                  }
                  return m
                })
              )
            }
          }

          if (ts.isArrowFunction(node)) {
            if (isTracing) {
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
          }

          if (ts.isFunctionExpression(node)) {
            if (isTracing) {
              if ((node.name && !traced.has(node.name.getText())) || !node.name) {
                if (node.name) {
                  traced.add(node.name.getText())
                }
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
            }
          }

          if (ts.isFunctionDeclaration(node) && tracingOn) {
            if (isTracing) {
              if ((node.name && !traced.has(node.name.getText())) || !node.name) {
                if (node.name) {
                  traced.add(node.name.getText())
                }

                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.body?.getStart() || node.getStart()
                )

                const name = node.name

                if (name) {
                  return [
                    ts.visitEachChild(node, visitor, ctx),
                    factory.createBinaryExpression(
                      factory.createElementAccessExpression(name, traceVar),
                      factory.createToken(ts.SyntaxKind.EqualsToken),
                      factory.createBinaryExpression(
                        fileVar,
                        factory.createToken(ts.SyntaxKind.PlusToken),
                        factory.createStringLiteral(
                          `:${line + 1}:${character + 1}:${name.getText()}`
                        )
                      )
                    )
                  ]
                }
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        const { fileName } = sourceFile

        let finalName = path.relative(process.cwd(), fileName)

        for (const k of moduleMapKeys) {
          const matches = finalName.match(k[1])
          if (matches) {
            let patchedName = moduleMap[k[0]]
            for (let j = 1; j < matches.length; j += 1) {
              patchedName = patchedName.replace("$" + j, matches[j])
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

        const traceNode = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                traceVar,
                undefined,
                undefined,
                factory.createStringLiteral("$trace")
              )
            ],
            ts.NodeFlags.Const
          )
        )

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
              factory.createIfStatement(
                factory.createIdentifier("f"),
                factory.createExpressionStatement(
                  factory.createBinaryExpression(
                    factory.createElementAccessExpression(
                      factory.createIdentifier("f"),
                      traceVar
                    ),
                    factory.createToken(ts.SyntaxKind.EqualsToken),
                    factory.createBinaryExpression(
                      fileVar,
                      factory.createToken(ts.SyntaxKind.PlusToken),
                      factory.createIdentifier("t")
                    )
                  )
                )
              ),
              factory.createReturnStatement(factory.createIdentifier("f"))
            ],
            true
          )
        )

        if (tracingOn) {
          const visited_ = ts.visitEachChild(sourceFile, visitor, ctx)
          const visited = dataFirstOn
            ? ts.visitEachChild(visited_, dataFirst, ctx)
            : visited_
          return factory.updateSourceFile(visited, [
            traceNode,
            fileNode,
            traceFNode,
            ...visited.statements
          ])
        }

        const visited_ = ts.visitEachChild(sourceFile, visitor, ctx)
        const visited = dataFirstOn
          ? ts.visitEachChild(visited_, dataFirst, ctx)
          : visited_

        return visited
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
  x: ts.SpreadElement
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
