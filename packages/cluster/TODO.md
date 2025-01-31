# Envelope

- [x] Remove Version from Envelope
- [x] Add Reply data type
- [ ] Add Envelope with last reply for resumable streams

# Streams

- [ ] Remodel reply persistence
- [ ] Track cursor position for consumer

## Protocol

1. Consumer - Stream request goes out ->
2. Producer - Stream request comes in <- (message state Processing)
3. Producer - Send back first message (with reply id) ->
4. Consumer - Receive message (with reply id) -> (update Processing state with reply id)
5. Consumer - Send back ack for message (with reply id) ->
6. Producer - Sends another message (with reply id) ->
7. Back to step 4
8. Producer - Send back terminal message (success or failure) -> (message state Processed)

### In the case of crashed producer

#### For "non-resumable" stream

In the case the communication channel goes down, the consumer interrupts the
stream and update the message state to "interrupted".

#### For "resumable" streams

The consumer just waits for the next message to come in.

The producer restarts with the partially processed message and last sent reply.

### In the case when replaying from storage

TODO
