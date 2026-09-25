import { assert, describe, it } from "@effect/vitest"
import { readFile } from "node:fs/promises"
import { parse } from "yaml"

interface Step {
  readonly name?: string
  readonly uses?: string
  readonly if?: string
  readonly run?: string
  readonly env?: Record<string, unknown>
  readonly with?: Record<string, unknown>
}

interface Job {
  readonly if?: string
  readonly env?: Record<string, unknown>
  readonly permissions?: Record<string, string>
  readonly steps?: ReadonlyArray<Step>
}

interface Workflow {
  readonly env?: Record<string, unknown>
  readonly permissions?: Record<string, string>
  readonly jobs: Record<string, Job>
}

const workflowPath = new URL("../../../../.github/workflows/release.yml", import.meta.url)

const secretReferences = (value: unknown, path: ReadonlyArray<string> = []): Array<readonly [string, string]> => {
  if (typeof value === "string") {
    return value.includes("secrets.") ? [[path.join("."), value]] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => secretReferences(item, [...path, String(index)]))
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => secretReferences(item, [...path, key]))
  }
  return []
}

describe("release workflow", () => {
  it("isolates credentials and permissions by route", async () => {
    const workflow = parse(await readFile(workflowPath, "utf8")) as Workflow
    const route = workflow.jobs.route
    const version = workflow.jobs.version
    const stage = workflow.jobs.stage

    assert.deepStrictEqual(Object.keys(workflow.jobs).sort(), ["route", "stage", "version"])
    assert.exists(route, "route job")
    assert.exists(version, "version job")
    assert.exists(stage, "stage job")
    assert.deepStrictEqual(workflow.permissions, {})

    for (const [name, job] of Object.entries(workflow.jobs)) {
      assert.deepStrictEqual(secretReferences(job.env, ["jobs", name, "env"]), [])
      const install = job.steps?.find((step) => step.uses === "./.github/actions/setup")
      assert.exists(install, `${name} install step`)
      assert.isUndefined(install.env, `${name} install step must not inherit step secrets`)

      for (const checkout of job.steps?.filter((step) => step.uses?.startsWith("actions/checkout@")) ?? []) {
        assert.strictEqual(checkout.with?.["persist-credentials"], false, `${name} checkout persists credentials`)
        assert.notProperty(checkout.with ?? {}, "token", `${name} checkout receives a token`)
      }
    }
    assert.deepStrictEqual(secretReferences(workflow.env, ["env"]), [])

    assert.deepStrictEqual(route.permissions, { contents: "read" })
    assert.deepStrictEqual(version.permissions, { contents: "write", "pull-requests": "write" })
    assert.deepStrictEqual(stage.permissions, { contents: "read", "id-token": "write" })

    const allSecrets = secretReferences(workflow)
    const patReferences = allSecrets.filter(([, value]) => value.includes("CHANGESET_GITHUB_TOKEN"))
    assert.lengthOf(patReferences, 1)
    assert.match(patReferences[0][0], /^jobs\.version\.steps\.\d+\.env\.GH_TOKEN$/)
    const stageTokenReferences = allSecrets.filter(([, value]) => value.includes("NPM_STAGE_TOKEN"))
    assert.deepStrictEqual(
      stageTokenReferences.map(([path]) => path),
      [
        `jobs.route.steps.${route.steps?.findIndex((step) => step.run?.includes("release route"))}.env.NPM_STAGE_TOKEN`,
        `jobs.stage.steps.${stage.steps?.findIndex((step) => step.run?.includes("release run"))}.env.NPM_STAGE_TOKEN`
      ]
    )
    assert.lengthOf(allSecrets, 3, "only the route-specific run steps may receive secrets")

    const routeStep = route.steps?.find((step) => step.run?.includes("release route"))
    assert.exists(routeStep)
    assert.deepStrictEqual(Object.keys(routeStep.env ?? {}), ["NPM_STAGE_TOKEN"])

    const versionStep = version.steps?.find((step) => step.env?.GH_TOKEN !== undefined)
    assert.exists(versionStep)
    assert.include(versionStep.run, "gh auth setup-git")
    assert.include(versionStep.run, "release run --tag rc --expect Version")
    assert.notProperty(version.permissions ?? {}, "id-token")

    const stageStep = stage.steps?.find((step) => step.run?.includes("release run"))
    assert.exists(stageStep)
    assert.include(stageStep.run, "release run --tag rc --expect Stage")
    assert.deepStrictEqual(Object.keys(stageStep.env ?? {}), ["NPM_STAGE_TOKEN"])
    assert.deepStrictEqual(
      secretReferences(stage, ["jobs", "stage"]).filter(([, value]) => value.includes("CHANGESET_GITHUB_TOKEN")),
      []
    )
  })

  it("keeps build preparation on the Stage route only", async () => {
    const workflow = parse(await readFile(workflowPath, "utf8")) as Workflow
    const stage = workflow.jobs.stage
    assert.exists(stage)
    assert.include(stage.if, "needs.route.outputs.tag == 'Stage'")

    const buildCommands = ["scripts/set-strip-internal.mjs", "pnpm codemod", "pnpm build"]
    for (const command of buildCommands) {
      const owners = Object.entries(workflow.jobs).filter(([, job]) =>
        job.steps?.some((step) => step.run?.includes(command))
      ).map(([name]) => name)
      assert.deepStrictEqual(owners, ["stage"], `${command} must only run in the stage job`)
    }
  })
})
