import { logger } from "@matechs/logger"
import { T, Service as F } from "@matechs/prelude"

export const appURI = "@matechs/cqrs/demo/appURI"

export interface AppOps {
  printTodo: (todo: string) => T.Sync<void>
}

export interface App {
  [appURI]: AppOps
}

export const appSpec = F.define<App>({
  [appURI]: {
    printTodo: F.fn()
  }
})

export const { printTodo } = F.access(appSpec)[appURI]

export const provideApp = F.implement(appSpec)({
  [appURI]: {
    printTodo: (todo) => logger.info(`todo: ${JSON.stringify(todo)}`)
  }
})
