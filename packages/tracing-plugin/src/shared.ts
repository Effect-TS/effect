import type ts from "typescript"

export interface Config {
  tracingOn: boolean
  checker: ts.TypeChecker
  moduleMap: Record<string, string>
  moduleMapKeys: (readonly [string, RegExp])[]
  programDir: string
  importTracingFrom: string
  mods: Map<string, ts.Identifier>
  traceCallLast: ts.Identifier
  traceCall: ts.Identifier
  traceCallId: ts.PropertyAccessExpression
  fileVar: ts.Identifier
  tracing: ts.Identifier
  isModule: boolean
  traceCallLastId: ts.PropertyAccessExpression
  fileName: string
  finalName: string
  getTrace(node: ts.Node): ts.BinaryExpression
  sourceFullText: string
  regions: (readonly [[boolean, number][], number])[]
  normalize(path: string): string
  checkRegionAt(
    regions: (readonly [[boolean, number][], number])[],
    line: number,
    char: number
  ): boolean
  factory: ts.NodeFactory
  isDisabledEverywhere: boolean
}
