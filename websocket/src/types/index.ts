export interface User {
   id: string
   username: string,
}

type EnumTypeMessage = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
   id: string,
   senderId: string,
   receiverId: string,
   content: string,
   status: EnumTypeMessage,
   sentAt: Date
}

export interface SeenMessage {
   id: string,
   senderId: string,
   status: EnumTypeMessage,
   receiverId: string,
   sentAt: Date
}
export type SeenMessageArray = SeenMessage[]

export interface ValidateResult<T> {
   success: boolean,
   data?: T,
   error?: string
}
