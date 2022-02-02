import * as Cause from "../../Cause"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { ExecutionStrategy, UIO } from "../../Effect"
import * as T from "../../Effect"
import * as E from "../../Either"
import { pipe } from "../../Function"
import type { Has } from "../../Has"
import type { Layer } from "../../Layer"
import * as M from "../../Managed"
import type { Annotations } from "../Annotations"
import * as ES from "../ExecutedSpec"
import * as Spec from "../Spec"
import * as TAM from "../TestAnnotationMap"
import * as TF from "../TestFailure"

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
