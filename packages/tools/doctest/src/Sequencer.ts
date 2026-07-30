import { readFile } from "node:fs/promises"
import { BaseSequencer, type TestSpecification } from "vitest/node"
import { hasRunnableExamples } from "./internal/Source.ts"

export default class DoctestSequencer extends BaseSequencer {
  override sort(specifications: Array<TestSpecification>): Promise<Array<TestSpecification>> {
    return Promise.all(
      specifications.map((specification) =>
        readFile(specification.moduleId, "utf8").then((source) => hasRunnableExamples(source))
      )
    ).then((matches) => super.sort(specifications.filter((_, index) => matches[index])))
  }
}
