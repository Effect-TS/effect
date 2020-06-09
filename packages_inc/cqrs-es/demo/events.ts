import * as M from "@matechs/morphic"

const TodoAdded_ = M.make((F) =>
  F.interface({
    type: F.stringLiteral("TodoAdded"),
    id: F.number(),
    todo: F.string()
  })
)

export interface TodoAdded extends M.AType<typeof TodoAdded_> {}

const TodoAdded = M.opaque_<TodoAdded>()(TodoAdded_)

const TodoRemoved_ = M.make((F) =>
  F.interface({
    type: F.stringLiteral("TodoRemoved"),
    id: F.number()
  })
)

export interface TodoRemoved extends M.AType<typeof TodoRemoved_> {}

const TodoRemoved = M.opaque_<TodoRemoved>()(TodoRemoved_)

// define all events in your domain
export const DomainEvent = M.makeADT("type")({ TodoAdded, TodoRemoved })
