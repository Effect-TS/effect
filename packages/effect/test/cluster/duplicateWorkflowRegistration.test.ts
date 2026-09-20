import { assert, describe, it } from "@effect/vitest"
import { ClusterWorkflowEngine } from "effect/unstable/cluster"

describe("duplicateWorkflowRegistrationWarning", () => {
  it("keeps the first definition when the same tag is registered again", () => {
    assert.strictEqual(
      ClusterWorkflowEngine.duplicateWorkflowRegistrationWarning("OrganizationDeploymentWorkflow", false),
      `Workflow "OrganizationDeploymentWorkflow" is already registered; keeping the first definition`
    )
  })

  it("mentions payload schema and annotations when the definitions differ", () => {
    assert.strictEqual(
      ClusterWorkflowEngine.duplicateWorkflowRegistrationWarning("OrganizationDeploymentWorkflow", true),
      `Workflow "OrganizationDeploymentWorkflow" is already registered with a different payload schema or annotations; keeping the first definition`
    )
  })
})
