import * as E from "../Either"
import { Dequeue } from "../Support/Dequeue"

import { Reservation } from "./Reservation"

export type State = E.Either<Dequeue<Reservation>, number>
