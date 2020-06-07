import * as M from "@matechs/morphic"

const { make, makeADT } = M.makeFor({})

const TodoAdded_ = make((F) =>
  F.interface(
    {
      type: F.stringLiteral("TodoAdded"),
      id: F.number(),
      todo: F.string()
    },
    "TodoAdded"
  )
)

export interface TodoAdded extends M.AType<typeof TodoAdded_> {}

const TodoAdded = M.opaque_<TodoAdded>()(TodoAdded_)

const TodoRemoved_ = make((F) =>
  F.interface(
    {
      type: F.stringLiteral("TodoRemoved"),
      id: F.number()
    },
    "TodoRemoved"
  )
)

export interface TodoRemoved extends M.AType<typeof TodoRemoved_> {}

const TodoRemoved = M.opaque_<TodoRemoved>()(TodoRemoved_)

// define all events in your domain
export const DomainEvent = makeADT("type")({ TodoAdded, TodoRemoved })
