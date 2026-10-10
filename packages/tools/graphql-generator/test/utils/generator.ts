/**
 * Helpers for the `generate` contract tests: running the generator over files
 * written to a temporary directory or over the GitHub fixture, and reading the
 * emitted text.
 *
 * The text helpers read the output line by line with indentation and a
 * trailing comma stripped, so a test pins the emitted expression for a key
 * without pinning the surrounding layout.
 */
import type * as Config from "@effect/graphql-generator/Config"
import * as Generator from "@effect/graphql-generator/Generator"
import { assert } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import { fileURLToPath, pathToFileURL } from "node:url"

export interface Generated {
  readonly result: Generator.GenerateResult
  /** Output paths relative to `cwd`, with `/` separators, sorted. */
  readonly paths: ReadonlyArray<string>
  /** The contents of the output at a `cwd`-relative path. Fails the test if it wasn't emitted. */
  readonly file: (relative: string) => string
}

const collect = (cwd: string, config: Config.Config) =>
  Effect.gen(function*() {
    const path = yield* Path.Path
    const result = yield* Generator.generate(config, { cwd })
    const byPath = new Map<string, string>()
    for (const file of result.files) {
      byPath.set(path.relative(cwd, path.resolve(cwd, file.path)).split(path.sep).join("/"), file.contents)
    }
    const generated: Generated = {
      result,
      paths: Array.from(byPath.keys()).sort(),
      file: (relative) => {
        const contents = byPath.get(relative)
        assert(contents !== undefined, `expected ${relative} among ${JSON.stringify(Array.from(byPath.keys()))}`)
        return contents
      }
    }
    return generated
  })

/** Writes `inputs` (cwd-relative path to contents) to a fresh temporary directory and generates there. */
export const generateIn = (inputs: Readonly<Record<string, string>>, config: Config.Config) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "graphql-generator-" })
    for (const [relative, body] of Object.entries(inputs)) {
      const file = path.join(cwd, relative)
      yield* fs.makeDirectory(path.dirname(file), { recursive: true })
      yield* fs.writeFileString(file, body)
    }
    return yield* collect(cwd, config)
  })

/** The directory holding the GitHub schema fixtures and `documents/`. */
export const githubFixtureDir = fileURLToPath(new URL("../fixtures/github", import.meta.url))

/**
 * The config the GitHub snapshot set is generated with. The shared module sits
 * beside the documents so every emitted file imports its siblings with `./`.
 */
export const githubConfig: Config.Config = {
  schema: "./schema.docs.graphql",
  documents: ["documents/*.graphql"],
  shared: "./documents/shared.graphql.ts",
  scalars: {
    DateTime: "./documents/scalars.ts#DateTime",
    URI: "./documents/scalars.ts#URI"
  }
}

export const generateGitHub = collect(githubFixtureDir, githubConfig)

export const errors = (generated: Generated) =>
  generated.result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")

export const warnings = (generated: Generated) =>
  generated.result.diagnostics.filter((diagnostic) => diagnostic.severity === "warning")

export const assertNoErrors = (generated: Generated): void => {
  assert.deepStrictEqual(
    errors(generated).map(({ column, line, message, path }) => `${path}:${line}:${column} ${message}`),
    []
  )
}

const lines = (text: string): ReadonlyArray<string> => text.split("\n").map((line) => line.trim())

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const memberPattern = (key: string) => new RegExp(`^${escapeRegExp(key)}: (.*?),?$`)

/** Every expression emitted for the struct key `key`, in file order. */
export const members = (text: string, key: string): ReadonlyArray<string> => {
  const pattern = memberPattern(key)
  return lines(text).flatMap((line) => {
    const match = pattern.exec(line)
    return match === null ? [] : [match[1]!]
  })
}

const uniqueIndex = (text: string, pattern: RegExp, what: string): number => {
  const found = lines(text).flatMap((line, i) => pattern.test(line) ? [i] : [])
  assert.strictEqual(found.length, 1, `expected exactly one ${what}`)
  return found[0]!
}

/** The expression emitted for the struct key `key`, which must appear once in the file. */
export const member = (text: string, key: string): string => {
  const index = uniqueIndex(text, memberPattern(key), `member ${key}`)
  return memberPattern(key).exec(lines(text)[index]!)![1]!
}

const docAbove = (text: string, index: number): ReadonlyArray<string> => {
  const all = lines(text)
  let end = index - 1
  if (end < 0 || !all[end]!.endsWith("*/")) return []
  let start = end
  while (start >= 0 && !all[start]!.startsWith("/**")) start--
  assert(start >= 0, "unterminated JSDoc")
  if (start === end) return [all[start]!.slice(3, -2).trim()]
  end--
  return all.slice(start + 1, end + 1).map((line) => line.replace(/^\*\s?/, ""))
}

/** The JSDoc lines directly above the struct key `key`, without the comment markers. */
export const docOf = (text: string, key: string): ReadonlyArray<string> =>
  docAbove(text, uniqueIndex(text, memberPattern(key), `member ${key}`))

const declarationPattern = (name: string) =>
  new RegExp(`^export (?:const|class|type|declare namespace) ${escapeRegExp(name)}\\b`)

/** Whether the module declares an export named `name`. */
export const declares = (text: string, name: string): boolean =>
  lines(text).some((line) => declarationPattern(name).test(line))

/** The first line declaring the export `name`. */
export const declaration = (text: string, name: string): string => {
  const line = lines(text).find((line) => declarationPattern(name).test(line))
  assert(line !== undefined, `expected a declaration of ${name}`)
  return line
}

/** The JSDoc lines directly above the first declaration of `name`. */
export const declarationDoc = (text: string, name: string): ReadonlyArray<string> =>
  docAbove(text, lines(text).findIndex((line) => declarationPattern(name).test(line)))

/** Fails unless every name in `names` is first declared in the given order. */
export const assertDeclaredInOrder = (text: string, names: ReadonlyArray<string>): void => {
  const all = lines(text)
  const indexed = names.map((name) => {
    const index = all.findIndex((line) => declarationPattern(name).test(line))
    assert(index >= 0, `expected a declaration of ${name}`)
    return { name, index }
  })
  assert.deepStrictEqual(indexed.slice().sort((a, b) => a.index - b.index).map(({ name }) => name), names)
}

/** The decoded `document` string of the operation exported as `name`. */
export const documentOf = (text: string, name: string): string => {
  const start = text.indexOf(`export const ${name} = `)
  assert(start >= 0, `expected an operation export ${name}`)
  const match = /document:\s*("(?:[^"\\]|\\.)*")/.exec(text.slice(start))
  assert(match !== null, `expected a document string for ${name}`)
  return JSON.parse(match[1]!)
}

/** The trimmed lines of the file, for whole-line assertions. */
export const fileLines = lines

/**
 * A small hand-written schema exercising every EFF-1832 mapping rule for
 * object types: each built-in scalar, a mapped (`Timestamp`) and unmapped
 * (`HTML`, `Markdown`) custom scalar plus one no operation reaches (`Blob`),
 * an enum with per-value docs and a deprecated value, nested input objects
 * with nullable, defaulted and list fields, and every list nullability shape.
 */
export const taskSchemaSdl = `
"""A point in time, sent as an ISO-8601 string."""
scalar Timestamp

"""Rendered HTML."""
scalar HTML

"""Markdown source."""
scalar Markdown

"""Never selected by the operations."""
scalar Blob

"""How urgent a task is."""
enum Priority {
  """Do it now."""
  HIGH
  """Whenever there is time."""
  LOW
  """Somewhere in between."""
  MEDIUM @deprecated(reason: "Use LOW instead.")
}

"""Matches a tag by name."""
input TagMatch {
  """The tag name."""
  name: String!
}

"""Filters tasks."""
input TaskFilter {
  """Only tasks at this priority."""
  priority: Priority
  """Only tasks due before this time."""
  dueBefore: Timestamp
  """How many tags must match."""
  minTags: Int! = 1
  """Tags the task must carry."""
  tags: [TagMatch!]
  """Text the task's notes must contain."""
  notesContain: Markdown
}

"""A unit of work."""
type Task {
  """The task's ID."""
  id: ID!
  """The task's title."""
  title: String!
  """Whether the task is finished."""
  done: Boolean!
  """Estimated hours of work."""
  estimate: Float
  """How many subtasks the task has."""
  subtaskCount: Int!
  """How urgent the task is."""
  priority: Priority!
  """A priority that overrides the computed one."""
  override: Priority
  """When the task is due."""
  due: Timestamp
  """The task's description, rendered."""
  bodyHTML: HTML!
  """Free-form labels."""
  labels: [String] @deprecated(reason: "Use \`tags\`.")
  """The task's tag names."""
  tagNames: [String!]!
  """Hours logged per day, per week."""
  hours: [[Int!]]!
  """A raw attachment."""
  attachment: Blob
}

type Query {
  """Tasks matching a filter."""
  tasks(filter: TaskFilter, first: Int! = 20, after: String): [Task!]!
  """Looks up one task."""
  task(id: ID!): Task
}
`

/** The usual layout for `taskSchemaSdl` tests: schema under `schema/`, documents under `src/`. */
export const taskConfig: Config.Config = {
  schema: "./schema/app.graphql",
  documents: ["src/**/*.graphql"],
  scalars: {
    Timestamp: "./scalars.ts#Timestamp"
  }
}

/** Generates `documents` (paths under `src/`) against `taskSchemaSdl`. */
export const generateTasks = (
  documents: Readonly<Record<string, string>>,
  config: Config.Config = taskConfig
) => generateIn({ "schema/app.graphql": taskSchemaSdl, ...documents }, config)

/**
 * Writes the generated files, in their `cwd`-relative layout, to a scratch
 * directory inside the package (so `effect` resolves) and imports the module
 * at `relative`. The directory is removed when the scope closes.
 */
export const importGenerated = (generated: Generated, relative: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = fileURLToPath(new URL("../.tmp", import.meta.url))
    yield* fs.makeDirectory(root, { recursive: true })
    const dir = yield* fs.makeTempDirectoryScoped({ directory: root, prefix: "import-" })
    for (const file of generated.paths) {
      const target = path.join(dir, file)
      yield* fs.makeDirectory(path.dirname(target), { recursive: true })
      yield* fs.writeFileString(target, generated.file(file))
    }
    const url = pathToFileURL(path.join(dir, relative)).href
    return yield* Effect.promise(() => import(/* @vite-ignore */ url) as Promise<Record<string, any>>)
  })
