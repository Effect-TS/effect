import * as LanguageModel from "@effect/ai/LanguageModel"
import type * as Response from "@effect/ai/Response"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"

export const withLanguageModel: {
  (options: {
    readonly generateText?:
      | Array<Response.PartEncoded>
      | ((options: LanguageModel.ProviderOptions) =>
        | Array<Response.PartEncoded>
        | Effect.Effect<Array<Response.PartEncoded>>)
    readonly streamText?:
      | Array<Response.StreamPartEncoded>
      | ((options: LanguageModel.ProviderOptions) =>
        | Array<Response.StreamPartEncoded>
        | Stream.Stream<Response.StreamPartEncoded>)
  }): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, LanguageModel.LanguageModel>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: {
    readonly generateText?:
      | Array<Response.PartEncoded>
      | ((options: LanguageModel.ProviderOptions) =>
        | Array<Response.PartEncoded>
        | Effect.Effect<Array<Response.PartEncoded>>)
    readonly streamText?:
      | Array<Response.StreamPartEncoded>
      | ((options: LanguageModel.ProviderOptions) =>
        | Array<Response.StreamPartEncoded>
        | Stream.Stream<Response.StreamPartEncoded>)
  }): Effect.Effect<A, E, Exclude<R, LanguageModel.LanguageModel>>
} = dual(2, <A, E, R>(effect: Effect.Effect<A, E, R>, options: {
  readonly generateText?:
    | Array<Response.PartEncoded>
    | ((options: LanguageModel.ProviderOptions) =>
      | Array<Response.PartEncoded>
      | Effect.Effect<Array<Response.PartEncoded>>)
  readonly streamText?:
    | Array<Response.StreamPartEncoded>
    | ((options: LanguageModel.ProviderOptions) =>
      | Array<Response.StreamPartEncoded>
      | Stream.Stream<Response.StreamPartEncoded>)
}): Effect.Effect<A, E, Exclude<R, LanguageModel.LanguageModel>> =>
  Effect.provideServiceEffect(
    effect,
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: (opts) => {
        if (Predicate.isUndefined(options.generateText)) {
          return Effect.succeed([])
        }
        if (Array.isArray(options.generateText)) {
          return Effect.succeed(options.generateText)
        }
        const result = options.generateText(opts)
        return Effect.isEffect(result) ? result : Effect.succeed(result)
      },
      streamText: (opts) => {
        if (Predicate.isUndefined(options.streamText)) {
          return Stream.empty
        }
        if (Array.isArray(options.streamText)) {
          return Stream.fromIterable(options.streamText)
        }
        const result = options.streamText(opts)
        return Array.isArray(result) ? Stream.fromIterable(result) : result
      }
    })
  ))
