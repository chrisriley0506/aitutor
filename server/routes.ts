import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, courses, documents, lessonPlans } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      return res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Documents routes
  app.post("/api/documents", async (req, res) => {
    const { title, content, uploadedById } = req.body;
    try {
      const [document] = await db.insert(documents).values({
        title,
        content,
        uploadedById,
      }).returning();
      return res.json(document);
    } catch (error) {
      console.error("Document creation error:", error);
      return res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Course routes
  app.post("/api/courses", async (req, res) => {
    const { title, description, teacherId } = req.body;
    try {
      const [course] = await db.insert(courses).values({
        title,
        description,
        teacherId,
      }).returning();
      return res.json(course);
    } catch (error) {
      console.error("Course creation error:", error);
      return res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Lesson plan routes
  app.post("/api/lesson-plans", async (req, res) => {
    const { title, content, courseId, scheduledDate } = req.body;
    try {
      const [lessonPlan] = await db.insert(lessonPlans).values({
        title,
        content,
        courseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      }).returning();
      return res.json(lessonPlan);
    } catch (error) {
      console.error("Lesson plan creation error:", error);
      return res.status(500).json({ message: "Failed to create lesson plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
