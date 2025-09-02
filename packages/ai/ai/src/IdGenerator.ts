/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Random from "effect/Random"

export class IdGenerator extends Context.Tag("@effect/ai/IdGenerator")<
  IdGenerator,
  Service
>() {}

export interface Service {
  readonly generateId: () => Effect.Effect<string>
}

export interface MakeOptions {
  readonly alphabet: string
  readonly prefix?: string | undefined
  readonly separator: string
  readonly size: number
}

const DEFAULT_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const DEFAULT_SEPARATOR = "_"
const DEFAULT_SIZE = 16

const makeGenerator = ({
  alphabet = DEFAULT_ALPHABET,
  prefix,
  separator = DEFAULT_SEPARATOR,
  size = DEFAULT_SIZE
}: Partial<MakeOptions>) => {
  const alphabetLength = alphabet.length
  return Effect.fnUntraced(function*() {
    const chars = new Array(size)
    for (let i = 0; i < size; i++) {
      chars[i] = alphabet[((yield* Random.next) * alphabetLength) | 0]
    }
    const identifier = chars.join("")
    if (Predicate.isUndefined(prefix)) {
      return identifier
    }
    return `${prefix}${separator}${identifier}`
  })
}

export const defaultIdGenerator: Service = {
  generateId: makeGenerator({ prefix: "id" })
}

export const make = Effect.fnUntraced(function*({
  alphabet = DEFAULT_ALPHABET,
  prefix,
  separator = DEFAULT_SEPARATOR,
  size = DEFAULT_SIZE
}: MakeOptions) {
  if (alphabet.includes(separator)) {
    const message = `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    return yield* new Cause.IllegalArgumentException(message)
  }

  const generateId = makeGenerator({ alphabet, prefix, separator, size })

  return {
    generateId
  } as const
})

export const layer = (options: MakeOptions): Layer.Layer<IdGenerator, Cause.IllegalArgumentException> =>
  Layer.effect(IdGenerator, make(options))
