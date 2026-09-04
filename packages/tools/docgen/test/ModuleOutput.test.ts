import { assert, describe, it } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, beforeAll } from "vitest"
import { authored, type Receipt, scenarios, source, stages } from "./fixtures/ModuleOutput.fixture.ts"

describe("module Markdown source-relative output", () => {
  const assertions: Array<string> = []
  const check = (identity: string, actual: unknown, expected: unknown) => {
    assertions.push(identity)
    assert.deepStrictEqual(actual, expected)
  }
  const artifactParent = process.env.DOCGEN_TEST_ARTIFACTS
  let artifactDirectory: string | undefined
  afterAll(() => {
    if (artifactParent === undefined) return
    if (artifactDirectory === undefined) throw new Error("DOCGEN_TEST_ARTIFACTS directory was not created")
    fs.writeFileSync(path.join(artifactDirectory, "trace.json"), JSON.stringify(assertions, null, 2), { flag: "wx" })
  })
  const results = new Map<string, { receipt: Receipt; status: number | null }>()
  beforeAll(() => {
    if (artifactParent !== undefined) {
      if (artifactParent.length === 0) throw new Error("DOCGEN_TEST_ARTIFACTS must name an existing directory")
      // This fresh evidence directory is explicitly retained for the caller, not temporary scratch space.
      artifactDirectory = fs.mkdtempSync(path.join(path.resolve(artifactParent), "docgen-module-output-"))
    }
    for (const scenario of scenarios) {
      const owned = fs.mkdtempSync(path.join(os.tmpdir(), `docgen-${scenario}-`))
      try {
        const cwd = path.join(owned, "project")
        const home = path.join(owned, "home")
        const tmp = path.join(owned, "tmp")
        for (const directory of [cwd, home, tmp]) fs.mkdirSync(directory)
        const destination = path.join(owned, "receipt.json")
        const srcDir = scenario === "dot"
          ? "."
          : scenario === "multi"
          ? "source/lib"
          : scenario === "absolute"
          ? path.join(cwd, "source/lib")
          : scenario === "absolute-cwd"
          ? cwd
          : undefined
        const child = spawnSync(process.execPath, [
          path.join(import.meta.dirname, "fixtures/ModuleOutput.fixture.ts"),
          scenario,
          destination
        ], {
          cwd,
          env: {
            PATH: process.env.PATH,
            HOME: home,
            TMPDIR: tmp,
            NO_COLOR: "1",
            ...(srcDir === undefined ? {} : { DOCGEN_SRC: srcDir })
          },
          timeout: 90_000,
          encoding: "utf8"
        })
        fs.writeFileSync(path.join(owned, "stdout.log"), child.stdout ?? "")
        fs.writeFileSync(path.join(owned, "stderr.log"), child.stderr ?? "")
        fs.writeFileSync(
          path.join(owned, "exit.json"),
          JSON.stringify({ status: child.status, signal: child.signal, error: String(child.error ?? "") })
        )
        const receipt: Receipt = JSON.parse(fs.readFileSync(destination, "utf8"))
        results.set(scenario, { receipt, status: child.status })
      } finally {
        try {
          if (artifactDirectory !== undefined) {
            fs.cpSync(owned, path.join(artifactDirectory, scenario), {
              recursive: true,
              force: false,
              errorOnExist: true
            })
          }
        } finally {
          fs.rmSync(owned, { recursive: true, force: true })
        }
      }
    }
  }, 600_000)

  for (const scenario of scenarios) {
    const result = () => {
      const value = results.get(scenario)
      if (value === undefined) throw new Error(`Missing native result: ${scenario}`)
      return value
    }
    it(`${scenario}: public CLI completes all five generations without example commands`, (context) => {
      const { receipt, status } = result()
      check(context.task.name, {
        status,
        error: receipt.error,
        stages: receipt.generations.map((g) => g.stage),
        commands: receipt.generations.flatMap((g) => g.commands)
      }, { status: 0, error: undefined, stages: [...stages], commands: [] })
    })
    it(`${scenario}: real CLI configuration and reads match complete public parser models`, (context) => {
      const { receipt } = result()
      const checks = receipt.generations.map((g) => {
        const prefix = scenario === "dot" || scenario === "absolute-cwd"
          ? ""
          : scenario === "multi" || scenario === "absolute"
          ? "source/lib/"
          : "src/"
        const local = scenario === "flat"
          ? g.stage === "removed" ? [] : [`${prefix}Flat.ts`]
          : [`${prefix}left/Shared.ts`, ...(g.stage === "removed" ? [] : [`${prefix}right/Shared.ts`])]
        const expected = local.map((file) =>
          scenario === "absolute" || scenario === "absolute-cwd" ? path.join(receipt.cwd, file) : file
        ).sort()
        return {
          config: g.config.srcDir === receipt.srcDir && g.config.outDir === "docs" &&
            g.config.projectName === "identity-fixture" && g.config.exclude.length === 0,
          actualConfigs: g.actualConfigs.length === expected.length &&
            g.actualConfigs.every((config) => JSON.stringify(config) === JSON.stringify(g.config)),
          scanned: [...g.scanned].sort(),
          reads: [...g.cliReads].sort(),
          paths: g.models.map((m) => m.path.join(path.sep)).sort(),
          sourcePaths: g.models.map((m) => m.sourcePath).sort(),
          sources: Object.values(g.inputs).map((s) => s.content).sort(),
          examples: g.models.reduce((n, m) => n + m.examples, 0),
          checks: g.checks,
          expected,
          expectedSources: local.map((file) =>
            source(file.includes("left/") ? "leftMarker" : file.includes("right/") ? "rightMarker" : "flatMarker")
          ).sort()
        }
      })
      check(
        context.task.name,
        checks,
        checks.map((c) => ({
          ...c,
          config: true,
          actualConfigs: true,
          scanned: c.expected,
          reads: c.expected,
          paths: c.expected,
          sourcePaths: c.expected.map((file) => path.resolve(receipt.cwd, file)).sort(),
          sources: c.expectedSources,
          examples: 0,
          checks: []
        }))
      )
    })
    for (const stage of stages) {
      it(`${scenario}/${stage}: distinct expected paths contain only their own module`, (context) => {
        const generation = result().receipt.generations.find((g) => g.stage === stage)
        if (generation === undefined) throw new Error(`Missing stage ${stage}`)
        const actual = Object.entries(generation.outputs).filter(([file]) => file.endsWith(".ts.md")).map((
          [file, snapshot]
        ) => [file, ["leftMarker", "rightMarker", "flatMarker"].filter((marker) => snapshot.content.includes(marker))])
          .sort()
        const expected = scenario === "flat"
          ? stage === "removed" ? [] : [["docs/modules/Flat.ts.md", ["flatMarker"]]]
          : [
            ["docs/modules/left/Shared.ts.md", ["leftMarker"]],
            ...(stage === "removed" ? [] : [["docs/modules/right/Shared.ts.md", ["rightMarker"]]])
          ]
        check(context.task.name, actual, expected)
      })
    }
    it(`${scenario}: unchanged generation is byte-stable twice`, (context) => {
      const { generations } = result().receipt
      check(context.task.name, generations.slice(1, 3).map((g) => g.outputs), [
        generations[0].outputs,
        generations[0].outputs
      ])
    })
    it(`${scenario}: authored home, module index and guide survive regeneration and removal`, (context) => {
      const actual = result().receipt.generations.slice(3).map((g) =>
        Object.fromEntries(Object.keys(authored).map((file) => [file, g.outputs[file]?.content]))
      )
      check(context.task.name, actual, [authored, authored])
    })
    it(`${scenario}: genuinely generated removed-module content is cleaned up`, (context) => {
      const { generations } = result().receipt
      const marker = scenario === "flat" ? "flatMarker" : "rightMarker"
      check(
        context.task.name,
        generations.slice(3).map((g) =>
          Object.entries(g.outputs).filter(([file, value]) => file.endsWith(".ts.md") && value.content.includes(marker))
            .length
        ),
        [1, 0]
      )
    })
  }
})
