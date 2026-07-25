/**
 * @since 0.6.0
 */

import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type * as SemanticModel from "./SemanticModel.ts"

/**
 * The renderer-independent semantic model written by the JSON projection.
 *
 * @category models
 * @since 0.6.0
 */
export type JsonModel = Omit<SemanticModel.SemanticModel, "diagnostics">

/**
 * Projects semantic documentation into JSON.
 *
 * @category projections
 * @since 0.6.0
 */
export const project = (model: SemanticModel.SemanticModel): string => {
  const output: JsonModel = {
    frontend: model.frontend,
    packages: model.packages,
    modules: model.modules,
    examples: model.examples
  }
  return `${JSON.stringify(output, null, 2)}\n`
}

/**
 * Writes the JSON semantic model to a file.
 *
 * @category projections
 * @since 0.6.0
 */
export const write = (model: SemanticModel.SemanticModel, outputFile: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const resolved = path.resolve(outputFile)
    yield* fs.makeDirectory(path.dirname(resolved), { recursive: true })
    yield* fs.writeFileString(resolved, project(model))
  })
