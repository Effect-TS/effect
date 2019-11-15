import * as T from "@matechs/effect";
import * as E from "fp-ts/lib/Either";
import { clientHelpers, reinterpretRemotely } from "../../src";
import { serviceA } from "../serviceA/service";
import { pipe } from "fp-ts/lib/pipeable";
import { httpClient } from "@matechs/http/lib";

const {
  serviceA: { computeHello }
} = clientHelpers(serviceA);

const serviceAClient = reinterpretRemotely(serviceA, "http://127.0.0.1:3000");

const runtime = pipe(
  T.noEnv,
  T.mergeEnv(serviceAClient),
  T.mergeEnv(httpClient())
);

const main = computeHello("It works!");

T.run(T.provide(runtime)(main))().then(r => {
  if (E.isLeft(r)) {
    console.error(r.left);
  } else {
    console.log(r.right);
  }
});
