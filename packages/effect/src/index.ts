import * as path from "path"
import * as ts from "typescript"

export interface TracingOptions {
  tracingModule?: string
  relativeToRoot?: string
}

/**
 * The Tracing Compiler Plugin offers the ability to enrich the source code with traces.
 *
 * To enable the plugin on a specific file the comment `// trace: on` must be present.
 *
 * The plugin looks for instructions on how to embed traces by looking at
 * the jsdoc tags of the functions and of the constants in your program and libraries.
 *
 * Tags are the following:
 * - `@module Module` indicate the name of the module
 * - `@trace i` indicate to patch the closure at the function argument `i` with traceF_
 * - `@trace replace i` indicate to replace the function argument `i` with `Traced<X>`
 * - `@trace append` indicate to append the trace as the last argument of the function
 * - `@trace suspend` indicate to use `suspend(() => X)` to add a trace before `X` (both for constants and functions)
 * - `@trace point-free` indicates to replace point-free with eta-introduction over 1st overload
 */
export default function tracingPlugin(_program: ts.Program, _opts: TracingOptions) {
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        const checker = _program.getTypeChecker()
        let tracingModule = _opts.tracingModule || "@effect-ts/core/Tracing"
        const entryDir = path.join(__dirname, _opts.relativeToRoot || "../")
        const file = sourceFile.fileName.replace(entryDir, "")

        const factory = ctx.factory

        const tracingFactory = factory.createUniqueName("TRACER")
        const tracingFileNameFactory = factory.createUniqueName("FILE_NAME")

        const traceRegex = /\/\/ trace: on/
        const overrideRegex = /\/\/ tracingModule: (.*)/

        const tracingEnabled = traceRegex.test(sourceFile.getFullText())

        const overrideMatches = overrideRegex.exec(sourceFile.getFullText())

        if (overrideMatches) {
          tracingModule = overrideMatches[1]
        }

        function visitor(node: ts.Node): ts.Node {
          if (tracingEnabled && ts.isPropertyAccessExpression(node)) {
            const symbol = checker.getTypeAtLocation(node).getSymbol()

            const traceTags = (
              symbol
                ?.getDeclarations()
                ?.map((e) =>
                  ts
                    .getAllJSDocTags(
                      e,
                      (t): t is ts.JSDocTag => t.tagName.getText() === "trace"
                    )
                    .map((e) => e.comment)
                )
                .reduce((flatten, entry) => flatten.concat(entry), []) || []
            ).filter((s): s is string => s != null)

            if (traceTags.includes("point-free")) {
              const signature = checker.getTypeAtLocation(node).getCallSignatures()[0]
              const params = signature.getParameters()

              if (
                checker
                  .getTypeAtLocation(node)
                  .getCallSignatures()
                  .findIndex(
                    (s) =>
                      s.getParameters().length !== params.length ||
                      s
                        .getParameters()
                        .findIndex((p) =>
                          p.valueDeclaration.getText().includes("...")
                        ) !== -1
                  ) !== -1
              ) {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.getEnd()
                )
                throw new TypeError(
                  `cannot safely desugar point-free due to multiple overloads with a different number of parameters or a variadic argument is present: ${
                    sourceFile.fileName
                  }:${line + 1}:${character + 1}`
                )
              }

              const method =
                symbol
                  ?.getDeclarations()
                  ?.map((e) => ts.getNameOfDeclaration(e)?.getText())
                  .filter((name) => name && name?.length > 0)[0] || "unknown"

              const context =
                symbol
                  ?.getDeclarations()
                  ?.map((e) =>
                    ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "module"
                      )
                      .map((e) => e.comment)
                  )
                  .reduce((flatten, entry) => flatten.concat(entry), [])[0] || "unknown"

              const named =
                symbol
                  ?.getDeclarations()
                  ?.map((e) =>
                    ts
                      .getAllJSDocTags(
                        e,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "named"
                      )
                      .map((e) => e.comment)
                  )
                  .reduce((flatten, entry) => flatten.concat(entry), [])[0] || undefined

              const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                node.getEnd()
              )

              const isSuspend = traceTags.includes("suspend")
              const isAppend = traceTags.includes("append")

              const args: ts.Identifier[] = []

              for (let z = 0; z < params.length; z += 1) {
                args.push(factory.createUniqueName(params[z].escapedName.toString()))
              }

              if (isSuspend) {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.expression.getEnd()
                )
                return factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    tracingFactory,
                    factory.createIdentifier("traceSuspend")
                  ),
                  undefined,
                  [
                    factory.createArrowFunction(
                      undefined,
                      undefined,
                      args.map((x) =>
                        factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          undefined,
                          x,
                          undefined,
                          undefined,
                          undefined
                        )
                      ),
                      undefined,
                      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                      factory.createCallExpression(node, undefined, [
                        ...args.map(
                          handleChild(
                            traceTags,
                            factory,
                            tracingFactory,
                            tracingFileNameFactory,
                            context,
                            named,
                            method,
                            visitor,
                            ctx,
                            line,
                            character
                          )
                        ),
                        ...(isAppend
                          ? [
                              factory.createBinaryExpression(
                                tracingFileNameFactory,
                                factory.createToken(ts.SyntaxKind.PlusToken),
                                factory.createStringLiteral(
                                  `:${line + 1}:${character + 1}:${context}:${
                                    named ? named : method
                                  }`
                                )
                              )
                            ]
                          : [])
                      ])
                    ),
                    factory.createBinaryExpression(
                      tracingFileNameFactory,
                      factory.createToken(ts.SyntaxKind.PlusToken),
                      factory.createStringLiteral(
                        `:${line + 1}:${character + 1}:${context}:${
                          named ? named : method
                        }`
                      )
                    )
                  ]
                )
              }

              return factory.createArrowFunction(
                undefined,
                undefined,
                args.map((x) =>
                  factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    x,
                    undefined,
                    undefined,
                    undefined
                  )
                ),
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                factory.createCallExpression(node, undefined, [
                  ...args.map(
                    handleChild(
                      traceTags,
                      factory,
                      tracingFactory,
                      tracingFileNameFactory,
                      context,
                      named,
                      method,
                      visitor,
                      ctx,
                      line,
                      character
                    )
                  ),
                  ...(isAppend
                    ? [
                        factory.createBinaryExpression(
                          tracingFileNameFactory,
                          factory.createToken(ts.SyntaxKind.PlusToken),
                          factory.createStringLiteral(
                            `:${line + 1}:${character + 1}:${context}:${
                              named ? named : method
                            }`
                          )
                        )
                      ]
                    : [])
                ])
              )
            }
          }

          if (tracingEnabled && ts.isVariableStatement(node)) {
            const declarations = node.declarationList.declarations.map((d) => {
              const traceTags = ts
                .getAllJSDocTags(
                  d,
                  (t): t is ts.JSDocTag => t.tagName.getText() === "trace"
                )
                .map((e) => e.comment)

              if (traceTags.length > 0) {
                const method = ts.getNameOfDeclaration(d)?.getText() || "unknown"

                const context =
                  ts
                    .getAllJSDocTags(
                      d,
                      (t): t is ts.JSDocTag => t.tagName.getText() === "module"
                    )
                    .map((e) => e.comment)[0] || "unknown"

                const named =
                  ts
                    .getAllJSDocTags(
                      d,
                      (t): t is ts.JSDocTag => t.tagName.getText() === "named"
                    )
                    .map((e) => e.comment)[0] || undefined

                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  d.getStart()
                )

                return factory.createVariableDeclaration(
                  d.name,
                  d.exclamationToken,
                  d.type,
                  factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      tracingFactory,
                      factory.createIdentifier("traceSuspend")
                    ),
                    undefined,
                    d.initializer
                      ? [
                          d.initializer,
                          factory.createBinaryExpression(
                            tracingFileNameFactory,
                            factory.createToken(ts.SyntaxKind.PlusToken),
                            factory.createStringLiteral(
                              `:${line + 1}:${character + 1}:${context}:${
                                named ? named : method
                              }`
                            )
                          )
                        ]
                      : undefined
                  )
                )
              }

              return d
            })

            return ts.visitEachChild(
              factory.createVariableStatement(node.modifiers, declarations),
              visitor,
              ctx
            )
          }

          if (tracingEnabled && ts.isCallExpression(node)) {
            const symbol = checker.getTypeAtLocation(node.expression).getSymbol()
            const overloadDeclarations = checker
              .getResolvedSignature(node)
              ?.getDeclaration()

            const overloadArgsToTrace = overloadDeclarations
              ? ts
                  .getAllJSDocTags(
                    overloadDeclarations,
                    (t): t is ts.JSDocTag => t.tagName.getText() === "trace"
                  )
                  .map((e) => e.comment)
                  .filter((s): s is string => s != null)
              : undefined

            const argsToTrace_ =
              symbol
                ?.getDeclarations()
                ?.map((e) =>
                  ts
                    .getAllJSDocTags(
                      e,
                      (t): t is ts.JSDocTag => t.tagName.getText() === "trace"
                    )
                    .map((e) => e.comment)
                )
                .reduce((flatten, entry) => flatten.concat(entry), []) || []

            const useOverloads =
              overloadArgsToTrace && overloadArgsToTrace.length > 0 ? true : false

            const argsToTrace = (overloadArgsToTrace && useOverloads
              ? overloadArgsToTrace
              : argsToTrace_
            ).filter((s): s is string => s != null)

            if (argsToTrace.length > 0) {
              if (
                (argsToTrace.findIndex((v) => v.includes("replace")) !== -1 ||
                  argsToTrace.findIndex((v) => /^(\d*)$/.test(v)) !== -1) &&
                node.arguments.findIndex((x) => ts.isSpreadElement(x)) !== -1
              ) {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.arguments.find((x) => ts.isSpreadElement(x))?.getStart() ||
                    node.getStart()
                )
                throw new TypeError(
                  `spread syntax is not available when "@trace i" or "@trace replace i" is defined at: ${
                    sourceFile.fileName
                  }:${line + 1}:${character + 1}`
                )
              }

              const method =
                useOverloads && overloadDeclarations
                  ? ts.getNameOfDeclaration(overloadDeclarations)?.getText() ||
                    "undefined"
                  : symbol
                      ?.getDeclarations()
                      ?.map((e) => ts.getNameOfDeclaration(e)?.getText())
                      .filter((name) => name && name?.length > 0)[0] || "unknown"

              const context =
                useOverloads && overloadDeclarations
                  ? ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "module"
                      )
                      .map((e) => e.comment)[0] || "unknown"
                  : symbol
                      ?.getDeclarations()
                      ?.map((e) =>
                        ts
                          .getAllJSDocTags(
                            e,
                            (t): t is ts.JSDocTag => t.tagName.getText() === "module"
                          )
                          .map((e) => e.comment)
                      )
                      .reduce((flatten, entry) => flatten.concat(entry), [])[0] ||
                    "unknown"

              const named =
                useOverloads && overloadDeclarations
                  ? ts
                      .getAllJSDocTags(
                        overloadDeclarations,
                        (t): t is ts.JSDocTag => t.tagName.getText() === "named"
                      )
                      .map((e) => e.comment)[0] || undefined
                  : symbol
                      ?.getDeclarations()
                      ?.map((e) =>
                        ts
                          .getAllJSDocTags(
                            e,
                            (t): t is ts.JSDocTag => t.tagName.getText() === "named"
                          )
                          .map((e) => e.comment)
                      )
                      .reduce((flatten, entry) => flatten.concat(entry), [])[0] ||
                    undefined

              const isSuspend = argsToTrace.includes("suspend")
              const isAppend = argsToTrace.includes("append")

              if (isAppend) {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.getStart()
                )
                return ts.visitEachChild(
                  factory.createCallExpression(node.expression, node.typeArguments, [
                    ...node.arguments,
                    factory.createBinaryExpression(
                      tracingFileNameFactory,
                      factory.createToken(ts.SyntaxKind.PlusToken),
                      factory.createStringLiteral(
                        `:${line + 1}:${character + 1}:${context}:${
                          named ? named : method
                        }`
                      )
                    )
                  ]),
                  visitor,
                  ctx
                )
              }

              if (isSuspend) {
                const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                  node.expression.getEnd()
                )
                return factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    tracingFactory,
                    factory.createIdentifier("traceSuspend")
                  ),
                  undefined,
                  [
                    ts.visitEachChild(node, visitor, ctx),
                    factory.createBinaryExpression(
                      tracingFileNameFactory,
                      factory.createToken(ts.SyntaxKind.PlusToken),
                      factory.createStringLiteral(
                        `:${line + 1}:${character + 1}:${context}:${
                          named ? named : method
                        }`
                      )
                    )
                  ]
                )
              }

              return factory.createCallExpression(
                node.expression,
                node.typeArguments,
                node.arguments.map((x, i, a) => {
                  const { character, line } = sourceFile.getLineAndCharacterOfPosition(
                    x.getStart()
                  )
                  return handleChild(
                    argsToTrace,
                    factory,
                    tracingFactory,
                    tracingFileNameFactory,
                    context,
                    named,
                    method,
                    visitor,
                    ctx,
                    line,
                    character
                  )(x, i, a)
                })
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(
          tracingEnabled
            ? factory.updateSourceFile(sourceFile, [
                factory.createVariableStatement(
                  undefined,
                  factory.createVariableDeclarationList(
                    [
                      factory.createVariableDeclaration(
                        tracingFileNameFactory,
                        undefined,
                        undefined,
                        factory.createStringLiteral(file)
                      )
                    ],
                    ts.NodeFlags.Const
                  )
                ),
                factory.createImportDeclaration(
                  undefined,
                  undefined,
                  factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamespaceImport(tracingFactory)
                  ),
                  factory.createStringLiteral(tracingModule)
                ),
                ...sourceFile.statements
              ])
            : sourceFile,
          visitor,
          ctx
        )
      }
    }
  }
}
function handleChild(
  argsToTrace: string[],
  factory: ts.NodeFactory,
  tracingFactory: ts.Identifier,
  tracingFileNameFactory: ts.Identifier,
  context: string,
  named: string | undefined,
  method: string,
  visitor: (node: ts.Node) => ts.Node,
  ctx: ts.TransformationContext,
  line: number,
  character: number
): (
  value: ts.Expression,
  index: number,
  array: readonly ts.Expression[]
) => ts.Expression {
  return (x, i) => {
    if (argsToTrace.includes("all") || argsToTrace.includes("" + i)) {
      return ts.visitEachChild(
        factory.createCallExpression(
          factory.createPropertyAccessExpression(
            tracingFactory,
            factory.createIdentifier("traceF_")
          ),
          undefined,
          [
            x,
            factory.createBinaryExpression(
              tracingFileNameFactory,
              factory.createToken(ts.SyntaxKind.PlusToken),
              factory.createStringLiteral(
                `:${line + 1}:${character + 1}:${context}:${named ? named : method}`
              )
            )
          ]
        ),
        visitor,
        ctx
      )
    }
    if (argsToTrace.includes("replace " + i)) {
      return ts.visitEachChild(
        factory.createCallExpression(
          factory.createPropertyAccessExpression(
            tracingFactory,
            factory.createIdentifier("traceReplace")
          ),
          undefined,
          [
            x,
            factory.createBinaryExpression(
              tracingFileNameFactory,
              factory.createToken(ts.SyntaxKind.PlusToken),
              factory.createStringLiteral(
                `:${line + 1}:${character + 1}:${context}:${named ? named : method}`
              )
            )
          ]
        ),
        visitor,
        ctx
      )
    }
    return ts.visitEachChild(x, visitor, ctx)
  }
}
