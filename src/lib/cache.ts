import { RedisClient } from "bun";

export const cacheClient = new RedisClient(process.env.REDIS_URL!);
