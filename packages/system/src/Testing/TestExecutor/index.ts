// ets_tracing: off

import * as Cause from "../../Cause/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { ExecutionStrategy, UIO } from "../../Effect/index.js"
import * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import { pipe } from "../../Function/index.js"
import type { Has } from "../../Has/index.js"
import type { Layer } from "../../Layer/index.js"
import * as M from "../../Managed/index.js"
import type { Annotations } from "../Annotations/index.js"
import * as ES from "../ExecutedSpec/index.js"
import * as Spec from "../Spec/index.js"
import * as TAM from "../TestAnnotationMap/index.js"
import * as TF from "../TestFailure/index.js"

export interface TestExecutor<R, E> {
  readonly run: (
    spec: Spec.ZSpec<R, E>,
    defExec: ExecutionStrategy
  ) => UIO<ES.ExecutedSpec<E>>
  readonly environment: Layer<unknown, never, R>
}

export function defaultExecutor<R extends Has<Annotations>, E>(
  env: Layer<unknown, never, R>
): TestExecutor<R, E> {
  return {
    environment: env,
    run: (spec, defExec) =>
      pipe(
        Spec.annotated(spec),
        Spec.provideLayer(env),
        Spec.forEachExec(
          defExec,
          (e) =>
            E.fold_(
              Cause.failureOrCause(e),
              ({ tuple: [failure, annotations] }) =>
                T.succeed(Tp.tuple(E.left(failure), annotations)),
              (cause) =>
                T.succeed(Tp.tuple(E.left(TF.halt(cause)), TAM.TestAnnotationMap.empty))
            ),
          ({ tuple: [success, annotations] }) =>
            T.succeed(Tp.tuple(E.right(success), annotations))
        ),
        M.use((_) =>
          pipe(
            _,
            Spec.foldM<unknown, never, ES.ExecutedSpec<E>>(defExec)(
              (_): M.Managed<unknown, never, ES.ExecutedSpec<E>> => {
                Spec.concreteSpecCase(_)
                switch (_._tag) {
                  case "SuiteCase": {
                    const v = _
                    return pipe(
                      v.specs,
                      M.map(
                        (specs) =>
                          new ES.ExecutedSpec(new ES.ExecutedSuiteCase(v.label, specs))
                      )
                    )
                  }
                  case "TestCase": {
                    const v = _
                    return pipe(
                      v.test,
                      T.map(
                        ({ tuple: [result, dynamicAnnotations] }) =>
                          new ES.ExecutedSpec(
                            new ES.ExecutedTestCase(
                              v.label,
                              result,
                              TAM.concat(v.annotations, dynamicAnnotations)
                            )
                          )
                      ),
                      T.toManaged
                    )
                  }
                }
              }
            ),
            M.useNow
          )
        )
      )
  }
}
