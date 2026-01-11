import { createAdapter } from "@socket.io/redis-adapter"
import { redis as pubClient } from './redis.js'

const subClient = pubClient.duplicate();
export const socketAdapter = createAdapter(pubClient, subClient)
