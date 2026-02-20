export interface User {
   id: string
   username: string,
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
   id: string,
   senderId: string,
   receiverId: string,
   content: string,
   status: MessageStatus,
   sentAt: Date
}

export interface SeenMessage {
   id: string,
   senderId: string,
   status: MessageStatus,
   receiverId: string,
   sentAt: Date
}

export interface SeenMessageInput {
   id: string,
   authorId: string,
   readerId: string,
}

export type SeenMessageArray = SeenMessage[]

export interface ValidateResult<T> {
   success: boolean,
   data?: T,
   error?: string
}
