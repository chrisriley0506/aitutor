import { relations, sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 10, enum: ['student', 'teacher'] }).notNull().default('student'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const educationalStandards = pgTable('educational_standards', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50, enum: ['common_core', 'state'] }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  gradeLevel: varchar('grade_level', { length: 20 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  teacherId: integer('teacher_id').references(() => users.id).notNull(),
  courseCode: varchar('course_code', { length: 8 }).unique().notNull(),
  subject: varchar('subject', { length: 50 }),
  gradeLevel: varchar('grade_level', { length: 20 }),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const courseEnrollments = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id).notNull(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  enrolledAt: timestamp('enrolled_at').default(sql`CURRENT_TIMESTAMP`),
});

export const weeklyTopics = pgTable('weekly_topics', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id).notNull(),
  topic: text('topic').notNull(),
  standardIdentifier: varchar('standard_identifier', { length: 100 }),
  weekStart: timestamp('week_start').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  courseId: integer('course_id').references(() => courses.id).notNull(),
  message: text('message').notNull(),
  response: text('response').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  teacher: one(users, {
    fields: [courses.teacherId],
    references: [users.id],
  }),
  weeklyTopics: many(weeklyTopics),
  materials: many(materials),
  enrollments: many(courseEnrollments),
  chatMessages: many(chatMessages),
}));

export const weeklyTopicsRelations = relations(weeklyTopics, ({ one }) => ({
  course: one(courses, {
    fields: [weeklyTopics.courseId],
    references: [courses.id],
  }),
  standard: one(educationalStandards, {
    fields: [weeklyTopics.standardIdentifier],
    references: [educationalStandards.identifier],
  }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [courseEnrollments.studentId],
    references: [users.id],
  }),
}));

// Export schemas and types
export const insertUserSchema = createInsertSchema(users);
export const insertCourseSchema = createInsertSchema(courses);
export const insertEducationalStandardSchema = createInsertSchema(educationalStandards);
export const insertWeeklyTopicSchema = createInsertSchema(weeklyTopics);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments);
export const insertMaterialSchema = createInsertSchema(materials);

export const selectUserSchema = createSelectSchema(users);
export const selectCourseSchema = createSelectSchema(courses);
export const selectEducationalStandardSchema = createSelectSchema(educationalStandards);
export const selectWeeklyTopicSchema = createSelectSchema(weeklyTopics);
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export const selectCourseEnrollmentSchema = createSelectSchema(courseEnrollments);
export const selectMaterialSchema = createSelectSchema(materials);

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type EducationalStandard = typeof educationalStandards.$inferSelect;
export type WeeklyTopic = typeof weeklyTopics.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type Material = typeof materials.$inferSelect;