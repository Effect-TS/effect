import * as M from "../index";
import { pipe } from "fp-ts/lib/pipeable";
import { Tracer as OT, Span as OS } from "opentracing";
import { Do } from "fp-ts-contrib/lib/Do";
import { ERROR } from "opentracing/lib/ext/tags";

export interface TracerFactory {
  tracer: {
    factory: () => OT;
  };
}

export const tracerFactoryDummy: TracerFactory = {
  tracer: {
    factory: () => new OT()
  }
};

export interface HasTracerContext {
  tracer: {
    context: {
      tracerInstance: OT;
    };
  };
}

export interface HasSpanContext {
  span: {
    context: {
      spanInstance: OS;
    };
  };
}

export interface Tracer {
  tracer: {
    withTracer<R, E, A>(
      ma: M.Effect<HasTracerContext & R, E, A>
    ): M.Effect<R & TracerFactory, E, A>;
    withControllerSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<R, Error, A>
    ) => M.Effect<R & HasTracerContext, Error, A>;
  };
}

export const tracer: Tracer = {
  tracer: {
    withTracer<R, E, A>(
      ma: M.Effect<HasTracerContext & R, E, A>
    ): M.Effect<R & TracerFactory, E, A> {
      return M.accessM(({ tracer: { factory } }: TracerFactory) =>
        M.provide<HasTracerContext>({
          tracer: { context: { tracerInstance: factory() } }
        })(ma)
      );
    },
    withControllerSpan(
      name: string
    ): <R, A>(
      ma: M.Effect<R, Error, A>
    ) => M.Effect<R & HasTracerContext, Error, A> {
      return ma =>
        M.accessM(
          ({
            tracer: {
              context: { tracerInstance }
            }
          }: HasTracerContext) =>
            Do(M.effectMonad)
              .bindL("span", () =>
                M.liftIO(() => {
                  return tracerInstance.startSpan(name);
                })
              )
              .bindL("res", ({ span }) =>
                pipe(
                  M.chainLeft(
                    pipe(
                      ma,
                      M.chain(r =>
                        Do(M.effectMonad)
                          .do(
                            M.liftIO(() => {
                              span.finish();
                            })
                          )
                          .return(() => r)
                      )
                    ),
                    e =>
                      pipe(
                        M.liftIO(() => {
                          span.setTag(ERROR, e.message);
                          span.finish();
                        }),
                        M.chain(() => M.left(e))
                      )
                  ),
                  M.provide<HasSpanContext>({
                    span: {
                      context: { spanInstance: span }
                    }
                  })
                )
              )
              .return(s => s.res)
        );
    }
  }
};

export function withTracer<R, E, A>(ma: M.Effect<HasTracerContext & R, E, A>) {
  return M.accessM(({ tracer }: Tracer) => tracer.withTracer(ma));
}

export function withControllerSpan(name: string) {
  return <R, A>(ma: M.Effect<R, Error, A>) =>
    M.accessM(({ tracer }: Tracer) => tracer.withControllerSpan(name)(ma));
}
