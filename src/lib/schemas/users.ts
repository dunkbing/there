import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rooms } from "./rooms";
import { roomMembers } from "./room-members";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  rooms: many(rooms),
  roomMembers: many(roomMembers),
}));

export type SelectUser = typeof users.$inferSelect;
