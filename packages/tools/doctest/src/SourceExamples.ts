/**
 * @since 4.0.0
 */

import * as doctrine from "doctrine"
import { readFile } from "node:fs/promises"
import * as NodePath from "node:path"
import ts from "typescript-compiler"
import { hasRunnableExamples } from "./internal/Source.ts"

/**
 * Represents the TypeScript declaration associated with a documentation example.
 *
 * @category models
 * @since 4.0.0
 */
export type DeclarationKind =
  | "module"
  | "namespace"
  | "class"
  | "staticMethod"
  | "instanceMethod"
  | "interface"
  | "typeAlias"
  | "constant"
  | "function"
  | "export"

/**
 * Represents an executable TypeScript example extracted from a JSDoc comment.
 *
 * @category models
 * @since 4.0.0
 */
export interface Example {
  readonly source: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declarationPathname: string
  readonly modulePath: ReadonlyArray<string>
  readonly declarationPath: ReadonlyArray<string>
  readonly declarationKind: DeclarationKind
  readonly index: number
  readonly name: string
}

/**
 * Represents the source and package locations used to extract examples from one file.
 *
 * @category models
 * @since 4.0.0
 */
export interface ExtractOptions {
  readonly file: string
  readonly source: string
  readonly packageName: string
  readonly packageRoot: string
  readonly workspaceRoot: string
}

/**
 * Represents the file and package locations used to read and extract examples.
 *
 * @category models
 * @since 4.0.0
 */
export interface ExtractFileOptions {
  readonly file: string
  readonly packageName: string
  readonly packageRoot: string
  readonly workspaceRoot: string
}

const extensionPattern = /\.[cm]?tsx?$/
const fencePattern = /(?:```|~~~)(.*?)\n([\s\S]*?)(?:(?:```|~~~)|$)/g
const skipTypeChecking = "skip-type-checking"

const nameText = (
  name: ts.DeclarationName | ts.BindingName | undefined,
  sourceFile: ts.SourceFile
): string | undefined => {
  if (name === undefined) return undefined
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  return name.getText(sourceFile)
}

const declarationName = (node: ts.Node, sourceFile: ts.SourceFile): string | undefined => {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.map((declaration) => nameText(declaration.name, sourceFile)).join(",")
  }
  if (ts.isExportSpecifier(node)) return node.name.text
  if (ts.isExportAssignment(node)) return "default"
  return nameText((node as ts.NamedDeclaration).name, sourceFile)
}

const declarationPath = (node: ts.Node, sourceFile: ts.SourceFile): ReadonlyArray<string> => {
  const path: Array<string> = []
  let current: ts.Node | undefined = node
  while (current !== undefined && !ts.isSourceFile(current)) {
    const name = declarationName(current, sourceFile)
    if (name !== undefined && name.length > 0) path.unshift(name)
    current = current.parent
  }
  return path
}

const declarationKind = (node: ts.Node): DeclarationKind => {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) return "class"
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
    return ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
      ? "staticMethod"
      : "instanceMethod"
  }
  if (ts.isInterfaceDeclaration(node)) return "interface"
  if (ts.isTypeAliasDeclaration(node)) return "typeAlias"
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) return "function"
  if (ts.isModuleDeclaration(node)) return "namespace"
  if (ts.isExportDeclaration(node) || ts.isExportSpecifier(node) || ts.isExportAssignment(node)) return "export"
  return "constant"
}

const snippets = (text: string): ReadonlyArray<string> => {
  const annotation = doctrine.parse(text, { unwrap: true })
  const description = annotation.description?.trim()
  const examples = annotation.tags.filter((tag) => tag.title === "example").map((tag) => tag.description?.trim() ?? "")
  const contents = description === undefined || description.length === 0 ? examples : [description, ...examples]
  return contents.flatMap((content) =>
    globalThis.Array.from(content.matchAll(fencePattern)).flatMap((match) => {
      const metadata = match[1].toLowerCase()
      return (metadata.startsWith("ts") || metadata.startsWith("typescript")) &&
          !metadata.includes(skipTypeChecking)
        ? [match[2].trim()]
        : []
    })
  )
}

/**
 * Extracts executable TypeScript examples from every JSDoc comment in one source file.
 *
 * **Details**
 *
 * This parser uses only the TypeScript syntax tree and does not require declarations to be exported.
 *
 * @category extraction
 * @since 4.0.0
 */
export const extract = (options: ExtractOptions): ReadonlyArray<Example> => {
  if (!hasRunnableExamples(options.source)) return []
  const sourceFile = ts.createSourceFile(
    options.file,
    options.source,
    ts.ScriptTarget.Latest,
    true,
    options.file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  const moduleName = NodePath.basename(options.file).replace(extensionPattern, "")
  const modulePath = NodePath.relative(options.packageRoot, options.file).split(NodePath.sep)
  const sourcePath = NodePath.relative(options.workspaceRoot, options.file).split(NodePath.sep).join("/")
  const seen = new Set<string>()
  const indices = new Map<string, number>()
  const examples: Array<Example> = []

  const visit = (node: ts.Node): void => {
    for (const doc of ts.getJSDocCommentsAndTags(node)) {
      if (doc.kind !== ts.SyntaxKind.JSDocComment) continue
      const key = `${doc.pos}:${doc.end}`
      if (seen.has(key)) continue
      seen.add(key)
      const path = declarationPath(node, sourceFile)
      const declaration = path.length === 0 ? moduleName : path.join(".")
      const name = declaration === moduleName ? moduleName : `${moduleName}.${declaration}`
      for (const source of snippets(doc.getText(sourceFile))) {
        const index = (indices.get(name) ?? 0) + 1
        indices.set(name, index)
        examples.push({
          source,
          packageName: options.packageName,
          sourcePath,
          declarationPathname: options.file,
          modulePath,
          declarationPath: path.length === 0 ? [moduleName] : path,
          declarationKind: path.length === 0 ? "module" : declarationKind(node),
          index,
          name: `${options.packageName}/${name} example ${index}`
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return examples
}

/**
 * Reads a TypeScript source file and extracts its executable JSDoc examples.
 *
 * @category extraction
 * @since 4.0.0
 */
export const extractFile = (options: ExtractFileOptions): Promise<ReadonlyArray<Example>> =>
  readFile(options.file, "utf8").then((source) => extract({ ...options, source }))
