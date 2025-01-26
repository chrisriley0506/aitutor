import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["teacher", "student"] }).notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents table for PDF storage and processing
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  processingStatus: text("processing_status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("pending"),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Lesson plans table
export const lessonPlans = pgTable("lesson_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  courseId: integer("course_id").references(() => courses.id),
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relationships
export const userRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  courses: many(courses),
}));

export const courseRelations = relations(courses, ({ one, many }) => ({
  teacher: one(users, {
    fields: [courses.teacherId],
    references: [users.id],
  }),
  lessonPlans: many(lessonPlans),
}));

// Create schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertCourseSchema = createInsertSchema(courses);
export const selectCourseSchema = createSelectSchema(courses);
export const insertLessonPlanSchema = createInsertSchema(lessonPlans);
export const selectLessonPlanSchema = createSelectSchema(lessonPlans);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type SelectDocument = typeof documents.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type SelectCourse = typeof courses.$inferSelect;
export type InsertLessonPlan = typeof lessonPlans.$inferInsert;
export type SelectLessonPlan = typeof lessonPlans.$inferSelect;
