import * as Arr from "../../Array.ts"
import { format, formatPropertyKey } from "../../Formatter.ts"
import type * as Schema from "../../Schema.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { type Binding, code, deferred, type Fragment, join, Module, type Render } from "../codegen.ts"
import { errorWithPath } from "../errors.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"
import * as CodeImports from "./codeImports.ts"

type Path = ReadonlyArray<string | number>
type CheckRepresentationAnnotation = SchemaRepresentation.CheckRepresentationAnnotation<
  SchemaRepresentation.Representation
>

interface Code {
  readonly runtime: Fragment
  readonly Type: Fragment
}

function makeFragments(runtime: Fragment, Type: Fragment): Code {
  return { runtime, Type }
}

/** @internal */
export function makeCode(runtime: string, Type: string): SchemaRepresentation.Code {
  return { runtime, Type }
}

function formatObjectLiteralKey(key: PropertyKey, formatted = formatPropertyKey(key)): string {
  return key === "__proto__" ? `[${formatted}]` : formatted
}

function renderEmittableAnnotation(input: unknown): string | undefined {
  if (typeof input === "number") {
    if (Number.isNaN(input)) return "globalThis.NaN"
    if (input === Infinity) return "globalThis.Infinity"
    if (input === -Infinity) return "-globalThis.Infinity"
  }
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean" ||
    typeof input === "number" ||
    typeof input === "bigint"
  ) return format(input)
  if (typeof input === "symbol") {
    const key = globalThis.Symbol.keyFor(input)
    return key === undefined ? undefined : `globalThis.Symbol.for(${format(key)})`
  }
  if (typeof input !== "object") return undefined
  if (Array.isArray(input)) {
    const values: Array<string> = []
    for (const value of input) {
      const rendered = renderEmittableAnnotation(value)
      if (rendered === undefined) return undefined
      values.push(rendered)
    }
    return `[${values.join(", ")}]`
  }

  const prototype = Object.getPrototypeOf(input)
  // Plain objects from other realms also have a prototype whose prototype is null.
  if (
    prototype !== null &&
    prototype !== Object.prototype &&
    Object.getPrototypeOf(prototype) !== null
  ) return undefined

  const entries: Array<string> = []
  for (const [key, value] of Object.entries(input)) {
    const rendered = renderEmittableAnnotation(value)
    if (rendered === undefined) return undefined
    entries.push(`${formatObjectLiteralKey(key)}: ${rendered}`)
  }
  return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`
}

// Leading checks that turn a bare `Schema.Number` into a built-in schema.
const canonicalNumberChecks: Record<string, string> = {
  [`Schema.isFinite().annotate({ "expected": "a finite number" })`]: "Schema.Finite",
  ["Schema.isInt()"]: "Schema.Int",
  [`Schema.isInt().annotate({ "expected": "an integer" })`]: "Schema.Int"
}

function renderAnnotations(
  annotations: Schema.Annotations.Annotations | undefined
): string | undefined {
  if (annotations === undefined) return undefined
  const entries: Array<string> = []
  for (const [key, value] of Object.entries(annotations)) {
    if (InternalAnnotations.annotationExcludedKeys.has(key)) continue
    const rendered = renderEmittableAnnotation(value)
    if (rendered !== undefined) entries.push(`${formatObjectLiteralKey(key)}: ${rendered}`)
  }
  return entries.length === 0 ? undefined : `{ ${entries.join(", ")} }`
}

/** @internal */
export function sanitizeJavaScriptIdentifier(input: string): string {
  if (input.length === 0) return "_"
  const out = input.replace(/[^A-Za-z0-9_$]/gu, "_")
  const first = out[0]
  return first >= "a" && first <= "z"
    ? first.toUpperCase() + out.slice(1)
    : first >= "0" && first <= "9"
    ? `_${out}`
    : out
}

function isSimpleLiveLiteral(
  representation: SchemaRepresentation.Representation
): representation is SchemaRepresentation.Literal {
  return representation._tag === "Literal" && representation.checks.length === 0 &&
    representation.annotations === undefined
}

interface TopologicalSort {
  readonly dependencies: ReadonlyMap<string, ReadonlySet<string>>
  readonly nonRecursives: ReadonlyArray<{
    readonly $ref: string
    readonly representation: SchemaRepresentation.Representation
  }>
  readonly recursives: Readonly<Record<string, SchemaRepresentation.Representation>>
}

function topologicalSort(
  references: SchemaRepresentation.References
): TopologicalSort {
  const identifiers = Object.keys(references)
  const identifierSet = new Set(identifiers)

  function collectRefs(root: SchemaRepresentation.Representation, includeSuspended: boolean): ReadonlySet<string> {
    const refs = new Set<string>()
    const visited = new WeakSet<object>()
    const stack: Array<SchemaRepresentation.Representation> = [root]

    function pushRepresentationSchemas(representation: CheckRepresentationAnnotation | undefined): void {
      if (representation?.schemas !== undefined) stack.push(...representation.schemas)
    }

    function pushChecks(
      checks: ReadonlyArray<SchemaRepresentation.Check>
    ): void {
      for (const check of checks) {
        pushRepresentationSchemas(check.representation)
        if (check._tag === "FilterGroup") pushChecks(check.checks)
      }
    }

    while (stack.length > 0) {
      const representation = stack.pop()!
      if (visited.has(representation)) continue
      visited.add(representation)
      if (representation._tag === "Reference") {
        if (identifierSet.has(representation.$ref)) refs.add(representation.$ref)
        continue
      }

      pushChecks(representation.checks)
      switch (representation._tag) {
        case "Declaration":
          pushRepresentationSchemas(representation.representation)
          stack.push(...representation.typeParameters)
          break
        case "Suspend":
          if (includeSuspended) stack.push(representation.thunk)
          break
        case "TemplateLiteral":
          stack.push(...representation.parts)
          break
        case "Arrays":
          for (const element of representation.elements) stack.push(element.type)
          stack.push(...representation.rest)
          break
        case "Objects":
          for (const property of representation.propertySignatures) stack.push(property.type)
          for (const signature of representation.indexSignatures) {
            stack.push(signature.parameter, signature.type)
          }
          break
        case "Union":
          stack.push(...representation.types)
          break
      }
    }
    return refs
  }

  const dependencies = new Map<string, ReadonlySet<string>>(
    identifiers.map((identifier) => [identifier, collectRefs(references[identifier], true)])
  )
  const eagerDependencies = new Map<string, ReadonlySet<string>>(
    identifiers.map((identifier) => [identifier, collectRefs(references[identifier], false)])
  )

  // Recursion describes the full schema graph, including suspended references.
  const recursive = new Set<string>()
  const indices = new Map<string, number>()
  const lowLinks = new Map<string, number>()
  const stack: Array<string> = []
  const onStack = new Set<string>()

  function visit(identifier: string): void {
    const index = indices.size
    indices.set(identifier, index)
    lowLinks.set(identifier, index)
    stack.push(identifier)
    onStack.add(identifier)
    for (const dependency of dependencies.get(identifier)!) {
      if (!indices.has(dependency)) {
        visit(dependency)
        lowLinks.set(identifier, Math.min(lowLinks.get(identifier)!, lowLinks.get(dependency)!))
      } else if (onStack.has(dependency)) {
        lowLinks.set(identifier, Math.min(lowLinks.get(identifier)!, indices.get(dependency)!))
      }
    }
    if (lowLinks.get(identifier) !== index) return
    const component: Array<string> = []
    let member: string
    do {
      member = stack.pop()!
      onStack.delete(member)
      component.push(member)
    } while (member !== identifier)
    if (component.length > 1 || dependencies.get(identifier)!.has(identifier)) {
      for (const member of component) recursive.add(member)
    }
  }

  for (const identifier of identifiers) {
    if (!indices.has(identifier)) visit(identifier)
  }

  // Every eager dependency belongs in the ordered group, so the remaining
  // recursive definitions can be emitted in any order.
  const firstGroup = new Set<string>()
  for (const identifier of identifiers) {
    if (!recursive.has(identifier)) firstGroup.add(identifier)
    for (const dependency of eagerDependencies.get(identifier)!) firstGroup.add(dependency)
  }

  // Explicit suspensions already break construction cycles in a valid input.
  const ordered: Array<string> = []
  const visited = new Set<string>()
  function order(identifier: string): void {
    if (visited.has(identifier)) return
    visited.add(identifier)
    for (const dependency of eagerDependencies.get(identifier)!) order(dependency)
    ordered.push(identifier)
  }
  for (const identifier of identifiers) order(identifier)

  const nonRecursives: Array<{
    readonly $ref: string
    readonly representation: SchemaRepresentation.Representation
  }> = []
  const recursives: Record<string, SchemaRepresentation.Representation> = {}
  for (const $ref of ordered) {
    if (firstGroup.has($ref)) {
      nonRecursives.push({ $ref, representation: references[$ref] })
    } else {
      InternalRecord.assignProperty(recursives, $ref, references[$ref])
    }
  }
  return { nonRecursives, recursives, dependencies: eagerDependencies }
}

/** @internal */
export function toCodeDocument(
  document: SchemaRepresentation.MultiDocument
): SchemaRepresentation.CodeDocument {
  const module = new Module(["globalThis"])
  // Consumers provide this namespace; track it without emitting a duplicate import.
  const schemaImport = module.addImport({
    module: "effect/Schema",
    kind: "Namespace",
    imported: "*",
    local: "Schema",
    typeOnly: false,
    attributes: ""
  })
  const artifacts: Array<{ readonly _tag: "Symbol" | "Enum"; readonly binding: Binding }> = []
  const sorted = topologicalSort(document.references)
  const sanitizedReferences = new Map<string, Binding>()
  const symbols = new Map<symbol, Binding>()
  const parsedImports = new Map<string, CodeImports.Imports>()
  const callbackImports = new Map<object, ReadonlyArray<CodeImports.Imports>>()

  for (const { $ref } of sorted.nonRecursives) ensureUniqueIdentifier($ref)
  for (const $ref of Object.keys(sorted.recursives)) ensureUniqueIdentifier($ref)

  for (
    const [$ref, representation] of [
      ...sorted.nonRecursives.map(({ $ref, representation }) => [$ref, representation] as const),
      ...Object.entries(sorted.recursives)
    ]
  ) {
    const fragments = recur(representation, ["references", $ref])
    module.define(
      ensureUniqueIdentifier($ref),
      [fragments.runtime, fragments.Type],
      Array.from(sorted.dependencies.get($ref)!, ensureUniqueIdentifier)
    )
  }
  const roots = document.representations.map((representation, index) =>
    recur(representation, ["representations", index])
  )
  const output = module.finalize(roots.flatMap((code) => [code.runtime, code.Type]))
  const definitions = new Map(
    output.declarations.map(({ binding, fragments }) => [binding, makeCode(fragments[0], fragments[1])] as const)
  )
  const nonRecursives = sorted.nonRecursives.map(({ $ref }) => {
    const binding = ensureUniqueIdentifier($ref)
    return { $ref: output.names.get(binding)!, code: definitions.get(binding)! }
  })
  const recursives: Record<string, SchemaRepresentation.Code> = {}
  for (const $ref of Object.keys(sorted.recursives)) {
    const binding = ensureUniqueIdentifier($ref)
    InternalRecord.assignProperty(recursives, output.names.get(binding)!, definitions.get(binding)!)
  }

  return {
    codes: roots.map((_, index) => makeCode(output.roots[index * 2], output.roots[index * 2 + 1])),
    references: { nonRecursives, recursives },
    artifacts: [
      ...CodeImports.render(Array.from(callbackImports.values()).flat()).map((importDeclaration) => ({
        _tag: "Import" as const,
        importDeclaration
      })),
      ...artifacts.map(({ _tag, binding }) => ({
        _tag,
        identifier: output.names.get(binding)!,
        code: definitions.get(binding)!
      }))
    ]
  }

  function ensureUniqueIdentifier(original: string): Binding {
    const existing = sanitizedReferences.get(original)
    if (existing !== undefined) return existing
    const candidate = freshIdentifier(original)
    sanitizedReferences.set(original, candidate)
    return candidate
  }

  function freshIdentifier(seed: string): Binding {
    return module.declare(sanitizeJavaScriptIdentifier(seed))
  }

  function compileCallback(
    inputs: ReadonlyArray<Code>,
    callback: (
      inputs: ReadonlyArray<SchemaRepresentation.Code>
    ) => SchemaRepresentation.Generation.DeclarationOutput | SchemaRepresentation.Generation.CheckOutput,
    path: Path
  ): Code {
    let previous: ReadonlyArray<SchemaRepresentation.Code> | undefined
    let output: SchemaRepresentation.Generation.DeclarationOutput | SchemaRepresentation.Generation.CheckOutput
    let lastRender: Render | undefined
    const identity = {}
    const evaluate = (render: Render) => {
      if (lastRender === render) return output
      lastRender = render
      const parameters = inputs.map((input) => makeCode(render(input.runtime), render(input.Type)))
      // Keep callback results when their inputs are unchanged, including across finalization.
      if (
        previous === undefined ||
        parameters.some((input, index) =>
          input.runtime !== previous![index].runtime || input.Type !== previous![index].Type
        )
      ) {
        output = callback(parameters)
        previous = parameters
        const imports = (output.importDeclarations ?? []).map((source, index) => {
          try {
            let parsed = parsedImports.get(source)
            if (parsed === undefined) {
              parsed = CodeImports.parse(source)
              parsedImports.set(source, parsed)
            }
            return parsed.filter((binding) =>
              binding.kind === "SideEffect" || module.addImport(binding) !== schemaImport
            )
          } catch (error) {
            throw errorWithPath(
              error instanceof Error ? error.message : String(error),
              [...path, "importDeclarations", index]
            )
          }
        })
        callbackImports.set(identity, imports)
      }
      return output
    }
    return makeFragments(
      deferred((render) => evaluate(render).runtime),
      deferred((render) => {
        const output = evaluate(render)
        return "Type" in output ? output.Type : "never"
      })
    )
  }

  function addSymbol(symbol: symbol): Binding {
    const existing = symbols.get(symbol)
    if (existing !== undefined) return existing
    const identifier = freshIdentifier("_symbol")
    symbols.set(symbol, identifier)
    const key = globalThis.Symbol.keyFor(symbol)
    const description = symbol.description
    artifacts.push({ _tag: "Symbol", binding: identifier })
    module.define(identifier, [
      key === undefined
        ? `globalThis.Symbol(${description === undefined ? "" : format(description)})`
        : `globalThis.Symbol.for(${format(key)})`,
      code`typeof ${identifier}`
    ])
    return identifier
  }

  function annotationSchemas(
    representation: CheckRepresentationAnnotation | undefined,
    path: Path
  ): ReadonlyArray<Code> {
    return representation?.schemas?.map((schema, index) => recur(schema, [...path, "schemas", index])) ?? []
  }

  function runtimeAnnotate(
    annotations: Schema.Annotations.Annotations | undefined,
    method: "annotate" | "annotateKey" = "annotate"
  ): string {
    const rendered = renderAnnotations(annotations)
    return rendered === undefined ? "" : `.${method}(${rendered})`
  }

  function unionOptionsRuntime(options: NonNullable<SchemaRepresentation.Union["options"]>): string {
    if (!Object.hasOwn(options, "mode")) return "{}"
    return `{ mode: ${options.mode === undefined ? "undefined" : format(options.mode)} }`
  }

  function compileCheck(
    check: SchemaRepresentation.Check,
    path: Path
  ): Fragment {
    const callback = check.annotations?.toCode
    let runtime: Fragment
    if (callback !== undefined) {
      const schemas = annotationSchemas(check.representation, [...path, "representation"])
      runtime = compileCallback(
        schemas,
        (schemas) => (callback as SchemaRepresentation.Generation.Check)({ schemas }),
        [...path, "annotations", "toCode"]
      ).runtime
    } else if (check._tag === "Filter") {
      throw errorWithPath("Missing toCode callback", [...path, "annotations", "toCode"])
    } else {
      runtime = code`Schema.makeFilterGroup([${
        join(check.checks.map((child, index) => compileCheck(child, [...path, "checks", index])), ", ")
      }])`
    }
    runtime = code`${runtime}${runtimeAnnotate(check.annotations)}`
    if (check._tag === "Filter" && check.aborted) runtime = code`${runtime}.abort()`
    return runtime
  }

  function applyNode(
    base: Code,
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path
  ): Code {
    let runtime = code`${base.runtime}${runtimeAnnotate(representation.annotations)}`
    for (let index = 0; index < representation.checks.length; index++) {
      const check = representation.checks[index]
      const compiledCheck = compileCheck(check, [...path, "checks", index])
      // Only collapse a bare number's leading canonical check.
      const current = runtime
      runtime = deferred((render) => {
        const base = render(current)
        const check = render(compiledCheck)
        return base === "Schema.Number" && Object.hasOwn(canonicalNumberChecks, check)
          ? canonicalNumberChecks[check]
          : `${base}.check(${check})`
      })
    }
    return makeFragments(runtime, base.Type)
  }

  function recur(
    representation: SchemaRepresentation.Representation,
    path: Path
  ): Code {
    if (representation._tag === "Reference") {
      if (!Object.hasOwn(document.references, representation.$ref)) {
        throw errorWithPath(`Invalid reference ${representation.$ref}`, [...path, "$ref"])
      }
      const identifier = ensureUniqueIdentifier(representation.$ref)
      return makeFragments(identifier, identifier)
    }
    return applyNode(on(representation, path), representation, path)
  }

  function on(
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path
  ): Code {
    switch (representation._tag) {
      case "Declaration": {
        const callback = representation.annotations?.toCode
        if (callback === undefined) {
          throw errorWithPath("Missing toCode callback", [...path, "annotations", "toCode"])
        }
        const typeParameters = representation.typeParameters.map((typeParameter, index) =>
          recur(typeParameter, [...path, "typeParameters", index])
        )
        return compileCallback(
          typeParameters,
          (typeParameters) => (callback as SchemaRepresentation.Generation.Declaration)({ typeParameters }),
          [...path, "annotations", "toCode"]
        )
      }
      case "Suspend": {
        const thunk = recur(representation.thunk, [...path, "thunk"])
        return makeFragments(code`Schema.suspend((): Schema.Codec<${thunk.Type}> => ${thunk.runtime})`, thunk.Type)
      }
      case "Null":
        return makeFragments("Schema.Null", "null")
      case "Undefined":
        return makeFragments("Schema.Undefined", "undefined")
      case "Void":
        return makeFragments("Schema.Void", "void")
      case "Never":
        return makeFragments("Schema.Never", "never")
      case "Unknown":
        return makeFragments("Schema.Unknown", "unknown")
      case "Any":
        return makeFragments("Schema.Any", "any")
      case "String":
        return makeFragments("Schema.String", "string")
      case "Number":
        return makeFragments("Schema.Number", "number")
      case "Boolean":
        return makeFragments("Schema.Boolean", "boolean")
      case "BigInt":
        return makeFragments("Schema.BigInt", "bigint")
      case "Symbol":
        return makeFragments("Schema.Symbol", "symbol")
      case "Literal": {
        const literal = format(representation.literal)
        return makeFragments(`Schema.Literal(${literal})`, literal)
      }
      case "UniqueSymbol": {
        const identifier = addSymbol(representation.symbol)
        return makeFragments(code`Schema.UniqueSymbol(${identifier})`, code`typeof ${identifier}`)
      }
      case "ObjectKeyword":
        return makeFragments("Schema.ObjectKeyword", "object")
      case "Enum": {
        const identifier = freshIdentifier("_Enum")
        artifacts.push({ _tag: "Enum", binding: identifier })
        module.define(identifier, [
          code`enum ${identifier} { ${
            representation.enums.map(([name, value]) => `${format(name)} = ${format(value)}`).join(
              ", "
            )
          } }`,
          code`typeof ${identifier}`
        ])
        return makeFragments(code`Schema.Enum(${identifier})`, identifier)
      }
      case "TemplateLiteral": {
        const parts = representation.parts.map((part, index) => recur(part, [...path, "parts", index]))
        const Type = code`\`${join(parts.map((part) => code`\${${part.Type}}`), "")}\``
        return makeFragments(code`Schema.TemplateLiteral([${join(parts.map((part) => part.runtime), ", ")}])`, Type)
      }
      case "Arrays": {
        const elements = representation.elements.map((element, index) => {
          const type = recur(element.type, [...path, "elements", index, "type"])
          return makeFragments(
            code`${element.isOptional ? "Schema.optionalKey(" : ""}${type.runtime}${element.isOptional ? ")" : ""}${
              runtimeAnnotate(element.annotations, "annotateKey")
            }`,
            element.isOptional ? code`(${type.Type})?` : type.Type
          )
        })
        const rest = representation.rest.map((item, index) => recur(item, [...path, "rest", index]))
        let result: Code
        if (Arr.isArrayNonEmpty(rest)) {
          const item = rest[0]
          if (elements.length === 0 && rest.length === 1) {
            result = makeFragments(
              code`Schema.Array(${item.runtime})`,
              code`globalThis.ReadonlyArray<${item.Type}>`
            )
          } else {
            const types = [
              ...elements.map((element) => element.Type),
              code`...globalThis.Array<${item.Type}>`,
              ...rest.slice(1).map((item) => item.Type)
            ]
            result = makeFragments(
              code`Schema.TupleWithRest(Schema.Tuple([${join(elements.map((element) => element.runtime), ", ")}]), [${
                join(rest.map((item) => item.runtime), ", ")
              }])`,
              code`readonly [${join(types, ", ")}]`
            )
          }
        } else {
          result = makeFragments(
            code`Schema.Tuple([${join(elements.map((element) => element.runtime), ", ")}])`,
            code`readonly [${join(elements.map((element) => element.Type), ", ")}]`
          )
        }
        return result
      }
      case "Objects": {
        const properties = representation.propertySignatures.map((property, index) => {
          const isSymbol = typeof property.name === "symbol"
          const name = isSymbol
            ? code`[${addSymbol(property.name)}]`
            : formatPropertyKey(property.name)
          const type = recur(property.type, [...path, "propertySignatures", index, "type"])
          let runtime = type.runtime
          if (property.isMutable) runtime = code`Schema.mutableKey(${runtime})`
          if (property.isOptional) runtime = code`Schema.optionalKey(${runtime})`
          runtime = code`${runtime}${runtimeAnnotate(property.annotations, "annotateKey")}`
          const runtimeName = property.name === "__proto__" ? code`[${name}]` : name
          const typeName = code`${property.isMutable ? "" : "readonly "}${name}${property.isOptional ? "?" : ""}`
          return {
            code: makeFragments(code`${runtimeName}: ${runtime}`, code`${typeName}: ${type.Type}`)
          }
        })
        const indexSignatures = representation.indexSignatures.map((signature, index) => ({
          parameter: recur(signature.parameter, [...path, "indexSignatures", index, "parameter"]),
          type: recur(signature.type, [...path, "indexSignatures", index, "type"])
        }))
        const propertyRuntimes = join(properties.map((property) => property.code.runtime), ", ")
        const propertyTypes = join(properties.map((property) => property.code.Type), ", ")
        let result: Code
        if (indexSignatures.length === 0) {
          result = makeFragments(
            code`Schema.Struct({ ${propertyRuntimes} })`,
            code`{ ${propertyTypes} }`
          )
        } else if (properties.length === 0 && indexSignatures.length === 1) {
          const signature = indexSignatures[0]
          result = makeFragments(
            code`Schema.Record(${signature.parameter.runtime}, ${signature.type.runtime})`,
            code`{ readonly [x: ${signature.parameter.Type}]: ${signature.type.Type} }`
          )
        } else {
          const indexRuntimes = join(
            indexSignatures.map((signature) =>
              code`Schema.Record(${signature.parameter.runtime}, ${signature.type.runtime})`
            ),
            ", "
          )
          const indexTypes = indexSignatures.map((signature) =>
            code`readonly [x: ${signature.parameter.Type}]: ${signature.type.Type}`
          )
          result = properties.length === 0
            ? makeFragments(
              code`Schema.StructWithRest(Schema.Struct({ ${propertyRuntimes} }), [${indexRuntimes}])`,
              code`{ ${join(indexTypes, ", ")} }`
            )
            : makeFragments(
              code`Schema.StructWithRest(Schema.Struct({ ${propertyRuntimes} }), [${indexRuntimes}])`,
              join([code`{ ${propertyTypes} }`, ...indexTypes.map((indexType) => code`{ ${indexType} }`)], " & ")
            )
        }
        return result
      }
      case "Union": {
        if (representation.options === undefined && representation.types.length === 0) {
          return makeFragments("Schema.Never", "never")
        }
        if (representation.options === undefined && representation.types.every(isSimpleLiveLiteral)) {
          const literals = representation.types.map((literal) => format(literal.literal))
          return literals.length === 1
            ? makeFragments(`Schema.Literal(${literals[0]})`, literals[0])
            : makeFragments(`Schema.Literals([${literals.join(", ")}])`, literals.join(" | "))
        }
        const types = representation.types.map((type, index) => recur(type, [...path, "types", index]))
        const options = representation.options === undefined
          ? ""
          : `, ${unionOptionsRuntime(representation.options)}`
        return makeFragments(
          code`Schema.Union([${join(types.map((type) => type.runtime), ", ")}]${options})`,
          types.length === 0 ? "never" : join(types.map((type) => type.Type), " | ")
        )
      }
    }
  }
}
