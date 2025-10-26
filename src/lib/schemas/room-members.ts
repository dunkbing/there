import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rooms } from "./rooms";
import { SelectUser, users } from "./users";

export const roomMembers = pgTable("room_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id"), // Unique ID for guest users (used for WebRTC peer identification)
  guestName: text("guest_name"), // For anonymous users
  role: text("role").default("member"), // 'creator', 'member'
  joinedAt: timestamp("joined_at").defaultNow().$type<string>(),
});

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomMembers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
}));

export type SelectRoomMember = typeof roomMembers.$inferSelect;
export type RoomMemberWithRelations = SelectRoomMember & {
  user?: SelectUser | null;
};
