// ets_tracing: off

import * as List from "../../Collections/Immutable/List/index.js"
import { pipe } from "../../Function/index.js"
import type { TestAnnotationMap } from "../TestAnnotationMap/index.js"

export interface TestAnnotationRenderer {
  readonly run: (
    ancestors: List.List<TestAnnotationMap>,
    child: TestAnnotationMap
  ) => List.List<string>
}

export class CompositeRenderer implements TestAnnotationRenderer {
  readonly renderers: List.List<TestAnnotationRenderer>

  constructor(_: readonly TestAnnotationRenderer[]) {
    this.renderers = List.from(_)
  }

  readonly run: (
    ancestors: List.List<TestAnnotationMap>,
    child: TestAnnotationMap
  ) => List.List<string> = (ancestors, child) =>
    pipe(
      this.renderers,
      List.chain((_) => _.run(ancestors, child))
    )
}

export const standard: TestAnnotationRenderer = new CompositeRenderer([])
