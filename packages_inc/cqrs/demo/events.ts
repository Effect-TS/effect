import * as M from "@matechs/morphic"

const TodoAdded_ = M.make((F) =>
  F.interface(
    {
      type: F.stringLiteral("TodoAdded"),
      id: F.number(),
      todo: F.string()
    },
    "TodoAdded"
  )
)

export interface TodoAddedRaw extends M.EType<typeof TodoAdded_> {}
export interface TodoAdded extends M.AType<typeof TodoAdded_> {}

const TodoAdded = M.opaque<TodoAddedRaw, TodoAdded>()(TodoAdded_)

const TodoRemoved_ = M.make((F) =>
  F.interface(
    {
      type: F.stringLiteral("TodoRemoved"),
      id: F.number()
    },
    "TodoRemoved"
  )
)

export interface TodoRemovedRaw extends M.EType<typeof TodoRemoved_> {}
export interface TodoRemoved extends M.AType<typeof TodoRemoved_> {}

const TodoRemoved = M.opaque<TodoRemovedRaw, TodoRemoved>()(TodoRemoved_)

// define all events in your domain
export const DomainEvent = M.makeADT("type")({ TodoAdded, TodoRemoved })
