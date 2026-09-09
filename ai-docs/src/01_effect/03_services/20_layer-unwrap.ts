/**
 * @title Creating Layers from configuration and/or Effects
 *
 * Build a layer dynamically from an Effect / Config with `Layer.unwrap`.
 */
import { Config, Context, Effect, Layer, Schema } from "effect"

export class MessageStoreError extends Schema.TaggedError<MessageStoreError>()("MessageStoreError", {
  cause: Schema.Defect()
}) {}

const MessageStoreTypeId = "~myapp/MessageStore"

export interface MessageStore {
  readonly [MessageStoreTypeId]: typeof MessageStoreTypeId

  append(message: string): Effect.Effect<void>
  readonly all: Effect.Effect<ReadonlyArray<string>>
}

/**
 * Service key for `MessageStore` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const MessageStore = (() => {
  const service = Context.Service<MessageStore>("myapp/MessageStore")
  const service1 = Object.assign(service, {
    layerInMemory: Layer.effect(
      service,
      Effect.sync(() => {
        const messages: Array<string> = []

        return service.of({
          [MessageStoreTypeId]: MessageStoreTypeId as typeof MessageStoreTypeId,
          append: (message) =>
            Effect.sync(() => {
              messages.push(message)
            }),
          all: Effect.sync(() => [...messages])
        })
      })
    )
  })
  const service2 = Object.assign(service1, {
    layerRemote: (url: URL) =>
      Layer.effect(
        service1,
        Effect.try({
          try: () => {
            // In a real app service1 is where you would open a network connection.
            const messages: Array<string> = []

            return service1.of({
              [MessageStoreTypeId]: MessageStoreTypeId as typeof MessageStoreTypeId,
              append: (message) =>
                Effect.sync(() => {
                  messages.push(`[${url.host}] ${message}`)
                }),
              all: Effect.sync(() => [...messages])
            })
          },
          catch: (cause) => new MessageStoreError({ cause })
        })
      )
  })
  const service3 = Object.assign(service2, {
    layer: Layer.unwrap(
      Effect.gen(function*() {
        // Read config inside an Effect, then choose which concrete layer to use.
        const useInMemory = yield* Config.Boolean("MESSAGE_STORE_IN_MEMORY").pipe(
          Config.withDefault(false)
        )

        if (useInMemory) {
          return service2.layerInMemory
        }

        const remoteUrl = yield* Config.URL("MESSAGE_STORE_URL")
        return service2.layerRemote(remoteUrl)
      })
    )
  })
  return service3
})()
