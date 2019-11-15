import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { serviceA, ServiceAConfig } from "./service";
import { tracerFactoryDummy, tracer, withTracer } from "@matechs/tracing/lib";
import { bindToApp } from "../../src";
import { pipe } from "fp-ts/lib/pipeable";
import express from "express";

const app = express();

const config: ServiceAConfig = {
  serviceA: {
    config: {
      prefix: "Hi: "
    }
  }
};

const runtime = pipe(
  T.noEnv,
  T.mergeEnv(serviceA),
  T.mergeEnv(config),
  T.mergeEnv(tracer),
  T.mergeEnv(tracerFactoryDummy)
);

const main = withTracer(bindToApp(app, serviceA, "serviceA", runtime));

T.run(T.provide(runtime)(main))().then(r => {
  if (E.isRight(r)) {
    app.listen(3000);
  }
});
