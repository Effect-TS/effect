import type { TestProject } from "vitest/node"
import { describeShared, sharedFiles, trinoContainer } from "./coordinator.ts"

/**
 * Starts the coordinator the integration suites share (`TrinoContainer.layer`);
 * suites that need a differently configured server start their own.
 */
export default function setup(project: TestProject) {
  return trinoContainer(sharedFiles).start().then((container) => {
    project.provide("trinoCoordinator", describeShared(container))
    return () => container.stop().then(() => undefined)
  })
}
