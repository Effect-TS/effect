// Layers for test/Projects.test.ts: one shared by the whole workspace (its root config), one shared
// by the `pkg` project (its config). Each build gets a new instance number; tests record what they saw.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

let built = 0

/** What each fixture test saw: the instances it was given. */
export const seen: Record<string, { readonly workspace: number; readonly project: number }> = {}

export class WorkspaceThing extends Context.Service<WorkspaceThing, { readonly instance: number }>()("WorkspaceThing") {
  static layer = Layer.effect(WorkspaceThing)(Effect.sync(() => ({ instance: ++built })))
}

export class ProjectThing extends Context.Service<ProjectThing, { readonly instance: number }>()("ProjectThing") {
  static layer = Layer.effect(ProjectThing)(Effect.sync(() => ({ instance: ++built })))
}

export const both = Layer.merge(WorkspaceThing.layer, ProjectThing.layer)

export const record = (name: string) =>
  Effect.gen(function*() {
    seen[name] = { workspace: (yield* WorkspaceThing).instance, project: (yield* ProjectThing).instance }
  })
