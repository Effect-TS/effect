import { assert, describe, it } from "@effect/vitest"
import { readFile } from "node:fs/promises"
import { parse } from "yaml"

interface Step {
  readonly id?: string
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
  readonly on?: Record<string, unknown>
  readonly env?: Record<string, unknown>
  readonly concurrency?: { readonly group?: string; readonly "cancel-in-progress"?: boolean }
  readonly permissions?: Record<string, string>
  readonly jobs: Record<string, Job>
}

const workflows = new URL("../../../../.github/workflows/", import.meta.url)

const load = async (file: string) => parse(await readFile(new URL(file, workflows), "utf8")) as Workflow

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

const buildCommands = ["scripts/set-strip-internal.mjs", "pnpm codemod", "pnpm build", "pnpm version", "stage publish"]

const assertCommonSafety = (name: string, workflow: Workflow) => {
  assert.deepStrictEqual(workflow.permissions, {}, `${name}: top-level permissions`)
  assert.deepStrictEqual(secretReferences(workflow.env, ["env"]), [], `${name}: workflow env secrets`)
  assert.strictEqual(workflow.concurrency?.["cancel-in-progress"], false, `${name}: cancel-in-progress`)
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.include(job.if, "github.repository_owner == 'Effect-Ts'", `${jobName}: owner guard`)
    assert.deepStrictEqual(secretReferences(job.env, ["jobs", jobName, "env"]), [], `${jobName}: job env secrets`)
    assert.notProperty(job.permissions ?? {}, "id-token", `${jobName}: must not mint OIDC tokens`)
    const install = job.steps?.find((step) => step.uses === "./.github/actions/setup")
    assert.exists(install, `${jobName}: install step`)
    assert.isUndefined(install.env, `${jobName}: install step must not inherit step secrets`)
    for (const checkout of job.steps?.filter((step) => step.uses?.startsWith("actions/checkout@")) ?? []) {
      assert.strictEqual(checkout.with?.["persist-credentials"], false, `${jobName}: checkout persists credentials`)
      assert.notProperty(checkout.with ?? {}, "token", `${jobName}: checkout receives a token`)
    }
    for (const command of buildCommands) {
      assert.isFalse(
        job.steps?.some((step) => step.run?.includes(command)) ?? false,
        `${jobName}: must not run ${command}; nothing is rebuilt or re-versioned after staging`
      )
    }
  }
}

describe("release readiness workflow", () => {
  it("runs on a schedule and on demand, with the stage token and the PAT confined to the readiness step", async () => {
    const workflow = await load("release-readiness.yml")
    assertCommonSafety("release-readiness", workflow)

    assert.exists(workflow.on?.schedule, "schedule trigger")
    assert.property(workflow.on ?? {}, "workflow_dispatch")
    assert.notProperty(workflow.on ?? {}, "push")

    assert.deepStrictEqual(Object.keys(workflow.jobs), ["readiness"])
    const job = workflow.jobs.readiness
    assert.deepStrictEqual(job.permissions, { contents: "write", "pull-requests": "write" })

    const step = job.steps?.find((step) => step.run?.includes("release readiness"))
    assert.exists(step, "readiness step")
    assert.include(step.run, "gh auth setup-git")
    assert.include(step.run, "release readiness --tag rc")
    assert.deepStrictEqual(Object.keys(step.env ?? {}).sort(), ["GH_TOKEN", "NPM_STAGE_TOKEN"])
    assert.include(String(step.env?.GH_TOKEN), "secrets.CHANGESET_GITHUB_TOKEN")
    assert.include(String(step.env?.NPM_STAGE_TOKEN), "secrets.NPM_STAGE_TOKEN")

    const index = job.steps?.indexOf(step)
    assert.deepStrictEqual(
      secretReferences(workflow).map(([path]) => path).sort(),
      [`jobs.readiness.steps.${index}.env.GH_TOKEN`, `jobs.readiness.steps.${index}.env.NPM_STAGE_TOKEN`]
    )
    assert.isFalse(job.steps?.some((step) => step.uses === "./.github/actions/deploy-website"))
  })
})

describe("publish workflow", () => {
  it("is dispatched by a maintainer against main with the identity and a one-time password", async () => {
    const workflow = await load("publish.yml")
    assertCommonSafety("publish", workflow)

    assert.deepStrictEqual(Object.keys(workflow.on ?? {}), ["workflow_dispatch"])
    const dispatch = workflow.on?.workflow_dispatch as {
      inputs?: Record<string, { required?: boolean; type?: string }>
    }
    assert.exists(dispatch.inputs?.identity, "identity input")
    assert.strictEqual(dispatch.inputs?.identity.required, true)
    assert.exists(dispatch.inputs?.otp, "otp input")
    assert.strictEqual(dispatch.inputs?.otp.required, true)

    assert.deepStrictEqual(Object.keys(workflow.jobs), ["publish"])
    const job = workflow.jobs.publish
    assert.include(job.if, "github.ref == 'refs/heads/main'")
    assert.deepStrictEqual(job.permissions, { contents: "read" })
    for (const checkout of job.steps?.filter((step) => step.uses?.startsWith("actions/checkout@")) ?? []) {
      assert.notProperty(checkout.with ?? {}, "ref", "publish must read the manifest from the dispatched main")
    }
  })

  it("confines the approve credentials to the publish step and gates the website on its output", async () => {
    const workflow = await load("publish.yml")
    const job = workflow.jobs.publish

    const publish = job.steps?.find((step) => step.run?.includes("release publish"))
    assert.exists(publish, "publish step")
    assert.strictEqual(publish.id, "publish")
    assert.include(publish.run, "release publish --expect-identity")
    assert.notInclude(publish.run, "--otp")
    assert.notInclude(publish.run, "inputs.otp")
    assert.deepStrictEqual(Object.keys(publish.env ?? {}).sort(), [
      "IDENTITY",
      "NPM_APPROVE_TOKEN",
      "NPM_OTP",
      "NPM_STAGE_TOKEN"
    ])
    assert.include(String(publish.env?.NPM_OTP), "inputs.otp")
    assert.include(String(publish.env?.IDENTITY), "inputs.identity")
    assert.include(String(publish.env?.NPM_APPROVE_TOKEN), "secrets.NPM_APPROVE_TOKEN")
    assert.include(String(publish.env?.NPM_STAGE_TOKEN), "secrets.NPM_STAGE_TOKEN")
    assert.include(publish.run, "published=")
    assert.include(publish.run, "revision=")
    assert.include(publish.run, "GITHUB_OUTPUT")

    const website = job.steps?.find((step) => step.uses === "./.github/actions/deploy-website")
    assert.exists(website, "website step")
    assert.include(website.if, "steps.publish.outputs.published == 'true'")
    assert.strictEqual(website.with?.channel, "v4")
    assert.include(String(website.with?.revision), "steps.publish.outputs.revision")
    assert.include(String(website.with?.["dispatch-token"]), "secrets.WEBSITE_DISPATCH_TOKEN")
    assert.isAbove(job.steps?.indexOf(website) ?? -1, job.steps?.indexOf(publish) ?? -1)

    const publishIndex = job.steps?.indexOf(publish)
    const websiteIndex = job.steps?.indexOf(website)
    assert.deepStrictEqual(
      secretReferences(workflow).map(([path]) => path).sort(),
      [
        `jobs.publish.steps.${publishIndex}.env.NPM_APPROVE_TOKEN`,
        `jobs.publish.steps.${publishIndex}.env.NPM_STAGE_TOKEN`,
        `jobs.publish.steps.${websiteIndex}.with.dispatch-token`
      ]
    )
  })
})

describe("release workflow after the publish flow", () => {
  it("still never publishes or deploys the website on a push to main", async () => {
    const workflow = await load("release.yml")
    for (const [name, job] of Object.entries(workflow.jobs)) {
      assert.isFalse(job.steps?.some((step) => step.uses === "./.github/actions/deploy-website"), `${name}: website`)
      assert.isFalse(job.steps?.some((step) => step.run?.includes("release publish")), `${name}: publish`)
      assert.isFalse(job.steps?.some((step) => step.run?.includes("stage approve")), `${name}: approve`)
    }
    assert.deepStrictEqual(secretReferences(workflow).filter(([, value]) => value.includes("NPM_APPROVE_TOKEN")), [])
    assert.deepStrictEqual(
      secretReferences(workflow).filter(([, value]) => value.includes("WEBSITE_DISPATCH_TOKEN")),
      []
    )
  })
})
