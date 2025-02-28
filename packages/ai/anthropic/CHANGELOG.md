# @effect/ai-anthropic

## 0.0.4

### Patch Changes

- Updated dependencies [[`e0746f9`](https://github.com/Effect-TS/effect/commit/e0746f9aa398b69c6542e375910683bf17f49f46), [`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - @effect/platform@0.77.4
  - effect@3.13.4
  - @effect/ai@0.10.4
  - @effect/experimental@0.41.4

## 0.0.3

### Patch Changes

- [#4504](https://github.com/Effect-TS/effect/pull/4504) [`a67a8a1`](https://github.com/Effect-TS/effect/commit/a67a8a1a4979fb7a039a060d067d805879da4d4b) Thanks @IMax153! - Introduce `AiModel` and `AiPlan` for describing retry / fallback logic between
  models and providers

  For example, the following program builds an `AiPlan` which will attempt to use
  OpenAi's chat completions API, and if after three attempts the operation
  is still failing, the plan will fallback to utilizing Anthropic's messages API
  to resolve the request.

  ```ts
  import { AiPlan, Completions } from "@effect/ai"
  import { AnthropicClient, AnthropicCompletions } from "@effect/ai-anthropic"
  import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
  import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"
  import { Config, Console, Effect, Layer } from "effect"

  // Create Anthropic client
  const Anthropic = AnthropicClient.layerConfig({
    apiKey: Config.redacted("ANTHROPIC_API_KEY")
  }).pipe(Layer.provide(NodeHttpClient.layerUndici))

  // Create OpenAi client
  const OpenAi = OpenAiClient.layerConfig({
    apiKey: Config.redacted("OPENAI_API_KEY")
  }).pipe(Layer.provide(NodeHttpClient.layerUndici))

  // Create a plan of request execution
  const Plan = AiPlan.fromModel(OpenAiCompletions.model("gpt-4o-mini"), {
    attempts: 3
  }).pipe(
    AiPlan.withFallback({
      model: AnthropicCompletions.model("claude-3-5-haiku-latest")
    })
  )

  const program = Effect.gen(function* () {
    // Build the plan of execution
    const plan = yield* Plan

    // Create a program which uses the services provided by the plan
    const getDadJoke = Effect.gen(function* () {
      const completions = yield* Completions.Completions
      const response = yield* completions.create("Tell me a dad joke")
      yield* Console.log(response.text)
    })

    // Provide the plan to whichever programs need it
    yield* plan.provide(getDadJoke)
  })

  program.pipe(Effect.provide([Anthropic, OpenAi]), NodeRuntime.runMain)
  ```

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124), [`a67a8a1`](https://github.com/Effect-TS/effect/commit/a67a8a1a4979fb7a039a060d067d805879da4d4b)]:
  - effect@3.13.3
  - @effect/ai@0.10.3
  - @effect/experimental@0.41.3
  - @effect/platform@0.77.3

## 0.0.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f), [`3e7ce97`](https://github.com/Effect-TS/effect/commit/3e7ce97f8a41756a039cf635d0b3d9a75d781097), [`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/platform@0.77.2
  - @effect/ai@0.10.2
  - @effect/experimental@0.41.2

## 0.0.1

### Patch Changes

- [#4446](https://github.com/Effect-TS/effect/pull/4446) [`9375c28`](https://github.com/Effect-TS/effect/commit/9375c28ca808325577da6c67cc92af25931027c8) Thanks @IMax153! - Add Anthropic AI provider integration

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc), [`9375c28`](https://github.com/Effect-TS/effect/commit/9375c28ca808325577da6c67cc92af25931027c8)]:
  - effect@3.13.1
  - @effect/ai@0.10.1
  - @effect/experimental@0.41.1
  - @effect/platform@0.77.1
