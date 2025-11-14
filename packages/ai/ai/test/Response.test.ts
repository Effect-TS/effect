import * as IdGenerator from "@effect/ai/IdGenerator"
import * as Response from "@effect/ai/Response"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

describe("Response", () => {
  describe("mergeAccumulatedParts", () => {
    it.effect(
      "should handle complete text and response deltas",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "Hello"
          }),
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: ", "
          }),
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "World!"
          }),
          Response.textAccumulatedPart({
            id: "1",
            status: "done",
            text: ""
          }),
          Response.reasoningAccumulatedPart({
            id: "2",
            status: "streaming",
            text: "I "
          }),
          Response.reasoningAccumulatedPart({
            id: "2",
            status: "streaming",
            text: "am "
          }),
          Response.reasoningAccumulatedPart({
            id: "2",
            status: "streaming",
            text: "thinking!"
          }),
          Response.reasoningAccumulatedPart({
            id: "2",
            status: "done",
            text: ""
          })
        ]
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.textAccumulatedPart({
            id: "1",
            text: "Hello, World!",
            status: "done"
          }),
          Response.reasoningAccumulatedPart({
            id: "2",
            text: "I am thinking!",
            status: "done"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle incomplete text delta with status 'streaming'",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "Hello"
          }),
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: ", "
          }),
          Response.textAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "World!"
          })
        ]
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.textAccumulatedPart({
            id: "1",
            text: "Hello, World!",
            status: "streaming"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle incomplete reasoning delta with status 'streaming'",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.reasoningAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "I "
          }),
          Response.reasoningAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "am "
          }),
          Response.reasoningAccumulatedPart({
            id: "1",
            status: "streaming",
            text: "thinking!"
          })
        ]
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.reasoningAccumulatedPart({
            id: "1",
            text: "I am thinking!",
            status: "streaming"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle complete tool call params",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-start"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: '"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "NYC"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "'}"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-done",
              params: {
                location: "NYC"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-done",
              params: {
                location: "NYC"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle incomplete tool call params",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-start"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: '"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "NYC"
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: 'NYC"
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle complete tool call params and tool result",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-start"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: '"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "NYC"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "'}"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-done",
              params: {
                location: "NYC"
              }
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-done",
              params: {
                location: "NYC"
              },
              result: {
                temperature: 12
              },
              encodedResult: {
                temperature: 12
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-done",
              params: {
                location: "NYC"
              },
              result: {
                temperature: 12
              },
              encodedResult: {
                temperature: 12
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should handle complete tool call and tool result error",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-start"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: '"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "NYC"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "'}"
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-done",
              params: {
                location: "NYC"
              }
            }
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-error",
              params: {
                location: "NYC"
              },
              result: {
                message: "Unknown location"
              },
              encodedResult: {
                message: "Unknown location"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-error",
              params: {
                location: "NYC"
              },
              result: {
                message: "Unknown location"
              },
              encodedResult: {
                message: "Unknown location"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return an empty accumulated parts if no parts need to be merged",
      Effect.fnUntraced(function*() {
        const parts: Array<Response.AccumulatedPart<any>> = []
        const accumulatedParts = yield* Response.mergeAccumulatedParts(parts)
        const expected: Array<Response.AccumulatedPart<any>> = []
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )
  })

  describe("accumulateStreamParts", () => {
    it.effect(
      "should return a text part with status 'done' for complete text stream parts",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.textStartPart({
            id: "1"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "Hello"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: ", "
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "World!"
          }),
          Response.textEndPart({
            id: "1"
          })
        ]
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.textAccumulatedPart({
            id: "1",
            text: "Hello, World!",
            status: "done"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return a reasoning part with status 'done' for complete reasoning stream parts",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.reasoningStartPart({
            id: "2"
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "I "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "am "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "thinking!"
          }),
          Response.reasoningEndPart({
            id: "2"
          })
        ]
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.reasoningAccumulatedPart({
            id: "2",
            text: "I am thinking!",
            status: "done"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return a text part with status 'streaming' for streaming text",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.textStartPart({
            id: "1"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "Hello"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: ", "
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "World!"
          })
        ]
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.textAccumulatedPart({
            id: "1",
            text: "Hello, World!",
            status: "streaming"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return a reasoning part with status 'streaming' for streaming reasoning",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.reasoningStartPart({
            id: "2"
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "I "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "am "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "thinking!"
          })
        ]
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.reasoningAccumulatedPart({
            id: "2",
            text: "I am thinking!",
            status: "streaming"
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return a tool with status 'params-done' for complete tool call params",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolParamsStartPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "{location: '"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "NYC"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "'}"
          }),
          Response.toolParamsEndPart({
            id: "1"
          }),
          Response.toolCallPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            params: {
              location: "NYC"
            }
          })
        ] as Array<Response.StreamPart<any>>
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-done",
              params: {
                location: "NYC"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return a tool with status 'params-streaming' for tool call streaming params",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolParamsStartPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "{location: '"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "NYC"
          })
        ] as Array<Response.StreamPart<any>>
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "params-streaming",
              params: "{location: 'NYC"
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should accumulate complete tool call params and tool result",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolParamsStartPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "{location: '"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "NYC"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "'}"
          }),
          Response.toolParamsEndPart({
            id: "1"
          }),
          Response.toolCallPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            params: {
              location: "NYC"
            }
          }),
          Response.toolResultPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            isFailure: false,
            result: {
              temperature: 12
            },
            encodedResult: {
              temperature: 12
            }
          })
        ] as Array<Response.StreamPart<any>>
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-done",
              params: {
                location: "NYC"
              },
              result: {
                temperature: 12
              },
              encodedResult: {
                temperature: 12
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should accumulate complete tool call and return tool result error as status 'result-error'",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.toolParamsStartPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "{location: '"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "NYC"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "'}"
          }),
          Response.toolParamsEndPart({
            id: "1"
          }),
          Response.toolCallPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            params: {
              location: "NYC"
            }
          }),
          Response.toolResultPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            isFailure: true,
            result: {
              message: "Unknown location"
            },
            encodedResult: {
              message: "Unknown location"
            }
          })
        ] as Array<Response.StreamPart<any>>
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-error",
              params: {
                location: "NYC"
              },
              result: {
                message: "Unknown location"
              },
              encodedResult: {
                message: "Unknown location"
              }
            }
          })
        ] as Array<Response.AccumulatedPart<any>>
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should preserve order for the streaming parts",
      Effect.fnUntraced(function*() {
        const parts = [
          Response.reasoningStartPart({
            id: "2"
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "I "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "am "
          }),
          Response.reasoningDeltaPart({
            id: "2",
            delta: "thinking!"
          }),
          Response.reasoningEndPart({
            id: "2"
          }),
          Response.textStartPart({
            id: "1"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "Hello"
          }),
          Response.textDeltaPart({
            id: "1",
            delta: ", "
          }),
          Response.textDeltaPart({
            id: "1",
            delta: "World!"
          }),
          Response.textEndPart({
            id: "1"
          }),
          Response.toolParamsStartPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "{location: '"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "NYC"
          }),
          Response.toolParamsDeltaPart({
            id: "1",
            delta: "'}"
          }),
          Response.toolParamsEndPart({
            id: "1"
          }),
          Response.toolCallPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            params: {
              location: "NYC"
            }
          }),
          Response.toolResultPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            isFailure: true,
            result: {
              message: "Unknown location"
            },
            encodedResult: {
              message: "Unknown location"
            }
          })
        ] as Array<Response.StreamPart<any>>
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected = [
          Response.reasoningAccumulatedPart({
            id: "2",
            text: "I am thinking!",
            status: "done"
          }),
          Response.textAccumulatedPart({
            id: "1",
            text: "Hello, World!",
            status: "done"
          }),
          Response.toolPart({
            id: "1",
            name: "getWeather",
            providerExecuted: false,
            value: {
              status: "result-error",
              params: {
                location: "NYC"
              },
              result: {
                message: "Unknown location"
              },
              encodedResult: {
                message: "Unknown location"
              }
            }
          })
        ]
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )

    it.effect(
      "should return an empty accumulated parts if no stream parts provided",
      Effect.fnUntraced(function*() {
        const parts: Array<Response.StreamPart<any>> = []
        const accumulatedParts = yield* Response.accumulateStreamParts([], parts)
        const expected: Array<Response.AccumulatedPart<any>> = []
        assert.deepStrictEqual(accumulatedParts, expected)
      })
    )
  })

  describe("accumulateParts", () => {
    const IdGeneratorTest = Layer.effect(
      IdGenerator.IdGenerator,
      Effect.gen(function*() {
        let counter = 1
        return {
          generateId: () =>
            Effect.gen(function*() {
              const id = counter.toString()
              counter++
              return id
            })
        }
      })
    )

    it.effect(
      "should return a text accumulated part for a text part",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.textPart({
              text: "Hello, World!"
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.textAccumulatedPart({
              id: "1",
              text: "Hello, World!",
              status: "done"
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )

    it.effect(
      "should return a reasoning accumulated part for a reasoning part",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.reasoningPart({
              text: "I am thinking!"
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.reasoningAccumulatedPart({
              id: "1",
              text: "I am thinking!",
              status: "done"
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )

    it.effect(
      "should return a tool accumulated part with status 'params-done' for a tool call part",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.toolCallPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              params: {
                location: "NYC"
              }
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.toolPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              value: {
                status: "params-done",
                params: {
                  location: "NYC"
                }
              }
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )

    it.effect(
      "should return a tool accumulated part with status 'result-done' for a tool call part and a successful tool result part respectively",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.toolCallPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              params: {
                location: "NYC"
              }
            }),
            Response.toolResultPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              isFailure: false,
              result: {
                teperature: 12
              },
              encodedResult: {
                teperature: 12
              }
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.toolPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              value: {
                status: "result-done",
                params: {
                  location: "NYC"
                },
                result: {
                  teperature: 12
                },
                encodedResult: {
                  teperature: 12
                }
              }
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )

    it.effect(
      "should return a tool accumulated part with status 'result-error' for a tool call part and a failure tool result part respectively",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.toolCallPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              params: {
                location: "NYC"
              }
            }),
            Response.toolResultPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              isFailure: true,
              result: {
                message: "Uknown location"
              },
              encodedResult: {
                message: "Uknown location"
              }
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.toolPart({
              id: "1",
              name: "getWeather",
              providerExecuted: false,
              value: {
                status: "result-error",
                params: {
                  location: "NYC"
                },
                result: {
                  message: "Uknown location"
                },
                encodedResult: {
                  message: "Uknown location"
                }
              }
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )

    it.effect(
      "should presever the order of the parts",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.Part<any>> = [
            Response.reasoningPart({
              text: "I am thinking!"
            }),
            Response.textPart({
              text: "Hello, World!"
            }),
            Response.toolCallPart({
              id: "3",
              name: "getWeather",
              providerExecuted: false,
              params: {
                location: "NYC"
              }
            }),
            Response.toolResultPart({
              id: "3",
              name: "getWeather",
              providerExecuted: false,
              isFailure: true,
              result: {
                message: "Uknown location"
              },
              encodedResult: {
                message: "Uknown location"
              }
            })
          ]
          const accumulatedParts = yield* Response.accumulateParts([], parts)
          const expected: Array<Response.AccumulatedPart<any>> = [
            Response.reasoningAccumulatedPart({
              id: "1",
              status: "done",
              text: "I am thinking!"
            }),
            Response.textAccumulatedPart({
              id: "2",
              status: "done",
              text: "Hello, World!"
            }),
            Response.toolPart({
              id: "3",
              name: "getWeather",
              providerExecuted: false,
              value: {
                status: "result-error",
                params: {
                  location: "NYC"
                },
                result: {
                  message: "Uknown location"
                },
                encodedResult: {
                  message: "Uknown location"
                }
              }
            })
          ]
          assert.deepStrictEqual(accumulatedParts, expected)
        }).pipe(
          Effect.provide(IdGeneratorTest)
        )
    )
  })
})
