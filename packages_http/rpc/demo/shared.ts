import * as T from "@matechs/core/Effect"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"

// environment entries
export const PlaceholderJsonURI: unique symbol = Symbol()

// simple todo interface
export interface Todo {
  userId: number
  id: number
  title: string
  completed: boolean
}

export interface PlaceholderJson extends F.ModuleShape<PlaceholderJson> {
  [PlaceholderJsonURI]: {
    getTodo: (n: number) => T.AsyncE<string, O.Option<Todo>>
  }
}

export const PlaceholderJsonService = F.define<PlaceholderJson>({
  [PlaceholderJsonURI]: {
    getTodo: F.fn()
  }
})
