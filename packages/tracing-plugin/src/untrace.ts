import ts from "typescript"

export default function untrace(
  _program: ts.Program,
  _opts?: {
    untrace?: boolean
  }
) {
  const untraceOn = _opts?.untrace === true
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            const signature = checker.getResolvedSignature(node)

            const entries: (readonly [string, string | undefined])[] =
              signature?.getJsDocTags().map((t) => [t.name, t.text] as const) || []

            const tags: Record<string, (string | undefined)[]> = {}

            for (const entry of entries) {
              if (!tags[entry[0]]) {
                tags[entry[0]] = []
              }
              tags[entry[0]!]!.push(entry[1])
            }

            if (
              "untrace" in tags &&
              (tags["untrace"]![0] === "traceFrom" || tags["untrace"]![0] === "traceAs")
            ) {
              return ts.visitEachChild(node.arguments[1], visitor, ctx)
            }
            if ("untrace" in tags && tags["untrace"]![0] === "traceCall") {
              return ts.visitEachChild(node.arguments[0], visitor, ctx)
            }
            if ("untrace" in tags && tags["untrace"]![0] === "accessCallTrace") {
              return factory.createIdentifier("undefined")
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return untraceOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
