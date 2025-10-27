import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rooms } from "./rooms";

export const roomSettings = pgTable("room_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  pomodoroWorkDuration: integer("pomodoro_work_duration").default(25),
  pomodoroBreakDuration: integer("pomodoro_break_duration").default(5),
  ambientSound: text("ambient_sound").default("rain"),
  musicUrl: text("music_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roomSettingsRelations = relations(roomSettings, ({ one }) => ({
  room: one(rooms, {
    fields: [roomSettings.roomId],
    references: [rooms.id],
  }),
}));
