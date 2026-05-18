import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import * as K8sHttpClient from "../src/K8sHttpClient.js"

describe("K8sHttpClient", () => {
  describe("Pod", () => {
    it.effect("decodes null lastTransitionTime values", () =>
      Effect.sync(() => {
        const pod = Schema.decodeSync(K8sHttpClient.Pod)({
          status: {
            phase: "Running",
            conditions: [
              {
                type: "Initialized",
                status: "True",
                lastTransitionTime: null
              },
              {
                type: "Ready",
                status: "False",
                lastTransitionTime: null
              }
            ],
            podIP: "10.0.0.1",
            hostIP: "10.0.0.2"
          }
        })

        assert.strictEqual(pod.status.conditions[0]?.lastTransitionTime, null)
        assert.isFalse(pod.isReady)
        assert.isTrue(pod.isReadyOrInitializing)
      }))
  })
})
