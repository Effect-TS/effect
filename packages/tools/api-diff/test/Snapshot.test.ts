import { extractSnapshot, SnapshotExtractionError } from "@effect/api-diff/Snapshot"
import { assert, describe, it } from "@effect/vitest"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFixturePackage } from "./utils.ts"

const source = `
export declare function overloaded<A extends string>(value: A): A
export declare function overloaded(value: number, radix?: number): string

export interface Parent {
  readonly parent: string
}

export interface Service<A = string> extends Parent {
  readonly value?: A
  run(input: A): Promise<A>
  [key: \`item-\${string}\`]: unknown
}

export declare class Client<A> implements Service<A> {
  static readonly version: string
  readonly parent: string
  readonly value?: A
  constructor(value?: A)
  run(input: A): Promise<A>
}

export type Recursive<A> = A | ReadonlyArray<Recursive<A>>
export type Conditional<A> = A extends readonly [infer Head, ...infer Tail] ? Head | Tail[number] : never
export type Mapped<A> = { readonly [K in keyof A as \`get\${Capitalize<string & K>}\`]?: A[K] }
export type Imported = import("node:fs").PathLike
export declare const token: unique symbol

export declare namespace merged {
  const value: string
  interface Options {
    readonly enabled: boolean
  }
}
export declare function merged(value: string): string
`

describe("canonical snapshot", () => {
  it("extracts declarations, overloads, namespaces, re-exports, and canonical types deterministically", () => {
    const root = mkdtempSync(join(tmpdir(), "api-diff-snapshot-"))
    writeFixturePackage(root, {
      "index.d.ts": `export * as Foo from "./Foo.js"\n`,
      "Foo.d.ts": source
    })

    const options = {
      repoRoot: root,
      ref: "fixture",
      sha: "0000000000000000000000000000000000000000",
      modules: ["@fixture/sample", "@fixture/sample/Foo"]
    }
    const first = extractSnapshot(options)
    const second = extractSnapshot(options)
    assert.deepStrictEqual(first, second)
    assert(first.entities.some((entity) =>
      entity.module === "@fixture/sample/Foo" &&
      entity.path.join(".") === "overloaded" &&
      entity.declarations.length === 2
    ))
    const overloaded = first.entities.find((entity) => entity.id === "@fixture/sample/Foo#overloaded#value")
    assert.deepStrictEqual(overloaded?.importRoutes, [
      { module: "@fixture/sample", path: ["Foo", "overloaded"] },
      { module: "@fixture/sample/Foo", path: ["overloaded"] }
    ])
    const client = first.entities.filter((entity) => entity.path.join(".") === "Client")
    assert.deepStrictEqual(client.map((entity) => entity.bucket), ["type", "value"])
    assert(first.entities.some((entity) => entity.path.join(".") === "merged.Options" && entity.bucket === "type"))
    assert(first.entities.some((entity) => JSON.stringify(entity.declarations).includes("\"kind\":\"conditional\"")))
    assert(first.entities.some((entity) => JSON.stringify(entity.declarations).includes("\"kind\":\"mapped\"")))
    const imported = first.entities.find((entity) => entity.path.join(".") === "Imported")
    assert(imported !== undefined, JSON.stringify(first.entities.map((entity) => entity.id)))
    assert(JSON.stringify(imported.declarations).includes("\"externalPackage\":\"node:fs\""))
  })

  it("fails rather than silently omitting unsupported public declarations", () => {
    const root = mkdtempSync(join(tmpdir(), "api-diff-snapshot-"))
    writeFixturePackage(root, {
      "Bad.d.ts": `
declare namespace Other {}
export declare namespace Bad {
  export import Alias = Other
}
`
    })
    let failure: unknown
    try {
      extractSnapshot({
        repoRoot: root,
        ref: "fixture",
        sha: "0000000000000000000000000000000000000000",
        modules: ["@fixture/sample/Bad"]
      })
    } catch (error) {
      failure = error
    }
    assert(failure instanceof SnapshotExtractionError)
    assert(failure.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-public-declaration"))
  })

  it("normalizes union order in structural fingerprints", () => {
    const leftRoot = mkdtempSync(join(tmpdir(), "api-diff-snapshot-"))
    const rightRoot = mkdtempSync(join(tmpdir(), "api-diff-snapshot-"))
    writeFixturePackage(leftRoot, { "Choice.d.ts": "export type Choice = string | number\n" })
    writeFixturePackage(rightRoot, { "Choice.d.ts": "export type Choice = number | string\n" })
    const extract = (repoRoot: string) =>
      extractSnapshot({
        repoRoot,
        ref: "fixture",
        sha: "0000000000000000000000000000000000000000",
        modules: ["@fixture/sample/Choice"]
      }).entities[0]?.fingerprint
    assert.strictEqual(extract(leftRoot), extract(rightRoot))
  })
})
