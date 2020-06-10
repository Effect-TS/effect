import fetch from "isomorphic-fetch"

import * as F from "../src"

import { binarySpec } from "./specs/binarySpec"
import { cancelSpec } from "./specs/cancelSpec"
import { dataSpec } from "./specs/dataSpec"
import { get404Spec } from "./specs/get404Spec"
import { getHttpsSpec } from "./specs/getHttps"
import { headersMiddlewareSpec } from "./specs/heasersMiddlewareSpec"
import { headersSpec } from "./specs/heasersSpec"
import { malformedSpec } from "./specs/malformedSpec"
import { methodsSpec } from "./specs/methodsSpec"
import { replaceHeadersSpec } from "./specs/replaceHeadersSpec"

import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

const fetchSuite = J.suite("Fetch")(
  methodsSpec,
  get404Spec,
  headersSpec,
  headersMiddlewareSpec,
  replaceHeadersSpec,
  dataSpec,
  binarySpec,
  getHttpsSpec,
  malformedSpec,
  cancelSpec
)

J.run(fetchSuite)(
  F.Client(fetch).with(
    H.MiddlewareStack([
      H.withPathHeaders(
        { foo: "bar" },
        (path) => path === "http://127.0.0.1:4015/middle",
        true
      )
    ])
  ).use
)
