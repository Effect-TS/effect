import * as T from "@matechs/core/Effect"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"

// environment entries
export const placeholderJsonEnv: unique symbol = Symbol()

// simple todo interface
export interface Todo {
  userId: number
  id: number
  title: string
  completed: boolean
}

export interface PlaceholderJson extends F.ModuleShape<PlaceholderJson> {
  [placeholderJsonEnv]: {
    getTodo: (n: number) => T.AsyncE<string, O.Option<Todo>>
  }
}

export const placeholderJsonM = F.define<PlaceholderJson>({
  [placeholderJsonEnv]: {
    getTodo: F.fn()
  }
})
