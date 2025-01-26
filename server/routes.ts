import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { analyzePDFContent } from "./openai";
import PDFParser from 'pdf2json';
import { join } from "path";
import { tmpdir } from "os";
import * as fs from 'fs/promises';
import path from "path";
import multer from "multer";
import { db } from "@db";
import { courses, weeklyTopics, educationalStandards, courseEnrollments, materials, chatMessages } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.resolve(tmpdir(), 'pacing-guides');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/upload-pacing-guide", (req, res) => {
    upload(req, res, async (err) => {
      let filePath = req.file?.path;

      try {
        if (err) {
          throw err;
        }

        if (!req.file || !filePath) {
          throw new Error("No file uploaded");
        }

        const courseId = parseInt(req.body.courseId);
        const grade = req.body.grade;
        const subject = req.body.subject;
        const startPage = parseInt(req.body.startPage) || 1;
        const endPage = parseInt(req.body.endPage) || undefined;

        if (!courseId || !grade || !subject) {
          throw new Error("Missing required fields");
        }

        // Verify course exists
        const [course] = await db
          .select()
          .from(courses)
          .where(eq(courses.id, courseId))
          .limit(1);

        if (!course) {
          throw new Error("Course not found");
        }

        console.log('Processing PDF:', filePath);

        // Extract raw text from PDF
        const pdfParser = new PDFParser();
        const rawContent = await new Promise<string>((resolve, reject) => {
          pdfParser.on("pdfParser_dataReady", (pdfData) => {
            try {
              // Extract raw text without any cleaning or filtering
              const extractedText = pdfData.Pages
                .slice(startPage - 1, endPage)
                .map(page => {
                  return page.Texts
                    .map(text => decodeURIComponent(text.R[0].T))
                    .join(' ');
                })
                .join('\n');

              console.log('Extracted raw text sample:', extractedText.slice(0, 200));
              resolve(extractedText);
            } catch (error) {
              reject(new Error('Failed to extract PDF content: ' + error));
            }
          });

          pdfParser.on("pdfParser_dataError", (error) => {
            reject(new Error(`PDF parsing failed: ${error}`));
          });

          pdfParser.loadPDF(filePath);
        });

        if (!rawContent.trim()) {
          throw new Error("No content extracted from PDF");
        }

        // Use AI to analyze the content
        const analysisResult = await analyzePDFContent({
          content: rawContent,
          metadata: {
            grade,
            subject,
            courseId,
            courseType: course.name
          }
        });

        console.log('AI Analysis result:', analysisResult);

        if (!analysisResult?.lessons || analysisResult.lessons.length === 0) {
          throw new Error("No lessons could be extracted from the content");
        }

        res.json({ lessons: analysisResult.lessons });

      } catch (error) {
        console.error('PDF processing error:', error);
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: `Failed to process pacing guide: ${message}` });
      } finally {
        // Clean up uploaded file
        if (filePath) {
          fs.unlink(filePath).catch(err => {
            console.error('Error cleaning up file:', err);
          });
        }
      }
    });
  });

  app.post("/api/courses", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can create courses" });
      }

      const { name, description, gradeLevel, subject } = req.body;
      const courseCode = generateCourseCode();

      const [course] = await db
        .insert(courses)
        .values({
          name,
          description,
          teacherId: req.user.id,
          courseCode,
          gradeLevel,
          subject,
        })
        .returning();

      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.post("/api/courses/join", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "student") {
        return res.status(403).json({ message: "Only students can join courses" });
      }

      const { courseCode } = req.body;

      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.courseCode, courseCode.toUpperCase()))
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Invalid course code" });
      }

      const [existingEnrollment] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, course.id),
            eq(courseEnrollments.studentId, req.user.id)
          )
        )
        .limit(1);

      if (existingEnrollment) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }

      const [enrollment] = await db
        .insert(courseEnrollments)
        .values({
          courseId: course.id,
          studentId: req.user.id,
        })
        .returning();

      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to join course" });
    }
  });

  app.get("/api/courses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userCourses = req.user.role === "teacher"
        ? await db
          .select()
          .from(courses)
          .where(eq(courses.teacherId, req.user.id))
        : await db
          .select({
            id: courses.id,
            name: courses.name,
            description: courses.description,
            teacherId: courses.teacherId,
            createdAt: courses.createdAt,
          })
          .from(courses)
          .innerJoin(
            courseEnrollments,
            eq(courses.id, courseEnrollments.courseId)
          )
          .where(eq(courseEnrollments.studentId, req.user.id));

      res.json(userCourses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:courseId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.courseId);
      let course;

      if (req.user.role === "teacher") {
        [course] = await db
          .select()
          .from(courses)
          .where(eq(courses.id, courseId))
          .where(eq(courses.teacherId, req.user.id))
          .limit(1);
      } else {
        [course] = await db
          .select({
            id: courses.id,
            name: courses.name,
            description: courses.description,
            teacherId: courses.teacherId,
            createdAt: courses.createdAt,
          })
          .from(courses)
          .innerJoin(
            courseEnrollments,
            eq(courses.id, courseEnrollments.courseId)
          )
          .where(
            and(
              eq(courseEnrollments.studentId, req.user.id),
              eq(courses.id, courseId)
            )
          )
          .limit(1);
      }

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });


  app.post("/api/materials", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "teacher") {
      return res.status(403).send("Only teachers can upload materials");
    }

    const { courseId, title, content, type } = req.body;
    const analysis = await analyzeMaterial(content);
    const [material] = await db
      .insert(materials)
      .values({
        courseId,
        title,
        content,
        type,
      })
      .returning();

    res.json({ ...material, analysis });
  });

  app.get("/api/materials/:courseId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const courseMaterials = await db
      .select()
      .from(materials)
      .where(eq(materials.courseId, parseInt(req.params.courseId)));

    res.json(courseMaterials);
  });

  app.post("/api/chat", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "student") {
        return res.status(403).json({ message: "Only students can use the chat" });
      }

      const { message, courseId } = req.body;

      const [enrollment] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.studentId, req.user.id)
          )
        )
        .limit(1);

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }

      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Fixed the weekly topics query
      const [currentTopic] = await db
        .select({
          topic: weeklyTopics.topic,
          standard: {
            identifier: educationalStandards.identifier,
            description: educationalStandards.description,
          },
        })
        .from(weeklyTopics)
        .leftJoin(
          educationalStandards,
          eq(weeklyTopics.standardIdentifier, educationalStandards.identifier)
        )
        .where(eq(weeklyTopics.courseId, courseId))
        .orderBy(desc(weeklyTopics.weekStart))
        .limit(1);

      const courseMaterials = await db
        .select({
          content: materials.content,
          type: materials.type
        })
        .from(materials)
        .where(eq(materials.courseId, courseId));

      const courseContext = {
        name: course.name,
        subject: course.subject,
        gradeLevel: course.gradeLevel,
        currentTopic: currentTopic?.topic || "No current topic set",
        standard: currentTopic?.standard || null,
      };

      const aiResponse = await generateTutorResponse(
        message,
        courseContext,
        courseMaterials
      );

      const [chatMessage] = await db
        .insert(chatMessages)
        .values({
          studentId: req.user.id,
          courseId,
          message,
          response: JSON.stringify(aiResponse),
        })
        .returning();

      res.json({
        ...chatMessage,
        response: aiResponse,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process chat message"
      });
    }
  });

  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "teacher") {
      return res.status(403).send("Unauthorized");
    }

    const teacherCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.teacherId, req.user.id));

    const courseIds = teacherCourses.map(c => c.id);

    const enrollments = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseIds[0])); // For now, just get first course

    const chats = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.courseId, courseIds[0]));

    const materialsCount = await db
      .select()
      .from(materials)
      .where(eq(materials.courseId, courseIds[0]));

    const activityData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        chats: Math.floor(Math.random() * 20),
        materials: Math.floor(Math.random() * 5),
      };
    }).reverse();

    res.json({
      totalStudents: enrollments.length,
      totalCourses: teacherCourses.length,
      totalChats: chats.length,
      totalMaterials: materialsCount.length,
      activityData,
    });
  });

  app.post("/api/weekly-topic", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can update weekly topics" });
      }

      const { courseId, topic, weekStart } = req.body;

      const [course] = await db
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, courseId),
            eq(courses.teacherId, req.user.id)
          )
        )
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const [weeklyTopic] = await db
        .insert(weeklyTopics)
        .values({
          courseId,
          topic,
          weekStart: new Date(weekStart),
        })
        .returning();

      res.json(weeklyTopic);
    } catch (error) {
      res.status(500).json({ message: "Failed to update weekly topic" });
    }
  });

  app.get("/api/weekly-topic/:courseId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.courseId);

      const [weeklyTopic] = await db
        .select()
        .from(weeklyTopics)
        .where(eq(weeklyTopics.courseId, courseId))
        .orderBy(desc(weeklyTopics.weekStart))
        .limit(1);

      res.json(weeklyTopic || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly topic" });
    }
  });

  app.post("/api/analyze-topic", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can analyze topics" });
      }

      const { description, grade, subject, standardsSystem } = req.body;

      const analysis = await analyzeTopic(
        description,
        grade,
        subject,
        standardsSystem
      );

      res.json(analysis);
    } catch (error) {
      console.error("Failed to analyze topic:", error);
      res.status(500).json({ message: "Failed to analyze topic" });
    }
  });

  app.post("/api/save-plan", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can save plans" });
      }

      const { courseId, dates, lessons } = req.body;

      if (!courseId || !Array.isArray(dates) || !Array.isArray(lessons)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Verify course exists and teacher has access
      const [course] = await db
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, parseInt(courseId)),
            eq(courses.teacherId, req.user.id)
          )
        )
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Create the weekly topics directly
      const topics = [];
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        try {
          // Parse and validate the date
          const weekStart = new Date(dates[i]);
          if (isNaN(weekStart.getTime())) {
            throw new Error(`Invalid date format for lesson ${i + 1}`);
          }

          const [topic] = await db
            .insert(weeklyTopics)
            .values({
              courseId: parseInt(courseId),
              topic: lesson.title,
              standardIdentifier: lesson.standard || null,
              weekStart: weekStart,
            })
            .returning();

          console.log(`Successfully created topic ${i + 1}/${lessons.length}:`, {
            title: topic.topic,
            date: topic.weekStart,
            standard: topic.standardIdentifier
          });

          topics.push(topic);
        } catch (error) {
          console.error(`Error creating topic for lesson ${i + 1}:`, error);
          throw error;
        }
      }

      console.log(`Successfully saved all ${topics.length} topics`);
      res.json(topics);
    } catch (error) {
      console.error("Failed to save plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save curriculum plan";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.get("/api/lesson-plans/:courseId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.courseId);

      const [course] = await db
        .select()
        .from(courses)
        .where(
          req.user.role === "teacher"
            ? and(eq(courses.id, courseId), eq(courses.teacherId, req.user.id))
            : eq(courses.id, courseId)
        )
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const lessonPlans = await db
        .select({
          id: weeklyTopics.id,
          topic: weeklyTopics.topic,
          weekStart: weeklyTopics.weekStart,
          standardIdentifier: weeklyTopics.standardIdentifier,
          standard: {
            identifier: educationalStandards.identifier,
            description: educationalStandards.description,
            subject: educationalStandards.subject,
            gradeLevel: educationalStandards.gradeLevel,
          },
        })
        .from(weeklyTopics)
        .leftJoin(
          educationalStandards,
          eq(weeklyTopics.standardIdentifier, educationalStandards.identifier)
        )
        .where(eq(weeklyTopics.courseId, courseId))
        .orderBy(weeklyTopics.weekStart);

      res.json(lessonPlans);
    } catch (error) {
      console.error("Failed to fetch lesson plans:", error);
      res.status(500).json({ message: "Failed to fetch lesson plans" });
    }
  });

  app.put("/api/lesson-plans/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can update lesson plans" });
      }

      const lessonPlanId = parseInt(req.params.id);
      const { topic, weekStart, standardIdentifier } = req.body;

      const [existingPlan] = await db
        .select({
          id: weeklyTopics.id,
          courseId: weeklyTopics.courseId,
        })
        .from(weeklyTopics)
        .innerJoin(courses, eq(weeklyTopics.courseId, courses.id))
        .where(
          and(
            eq(weeklyTopics.id, lessonPlanId),
            eq(courses.teacherId, req.user.id)
          )
        )
        .limit(1);

      if (!existingPlan) {
        return res.status(404).json({ message: "Lesson plan not found" });
      }

      const [updatedPlan] = await db
        .update(weeklyTopics)
        .set({
          topic,
          weekStart: new Date(weekStart),
          standardIdentifier,
        })
        .where(eq(weeklyTopics.id, lessonPlanId))
        .returning();

      res.json(updatedPlan);
    } catch (error) {
      console.error("Failed to update lesson plan:", error);
      res.status(500).json({ message: "Failed to update lesson plan" });
    }
  });

  app.delete("/api/lesson-plans/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can delete lesson plans" });
      }

      const lessonPlanId = parseInt(req.params.id);

      const [existingPlan] = await db
        .select({
          id: weeklyTopics.id,
          courseId: weeklyTopics.courseId,
        })
        .from(weeklyTopics)
        .innerJoin(courses, eq(weeklyTopics.courseId, courses.id))
        .where(
          and(
            eq(weeklyTopics.id, lessonPlanId),
            eq(courses.teacherId, req.user.id)
          )
        )
        .limit(1);

      if (!existingPlan) {
        return res.status(404).json({ message: "Lesson plan not found" });
      }

      await db
        .delete(weeklyTopics)
        .where(eq(weeklyTopics.id, lessonPlanId));

      res.json({ message: "Lesson plan deleted successfully" });
    } catch (error) {
      console.error("Failed to delete lesson plan:", error);
      res.status(500).json({ message: "Failed to delete lesson plan" });
    }
  });

  app.get("/api/lesson-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can view all lesson plans" });
      }

      const lessonPlans = await db
        .select({
          id: weeklyTopics.id,
          topic: weeklyTopics.topic,
          weekStart: weeklyTopics.weekStart,
          courseId: weeklyTopics.courseId,
          courseName: courses.name,
        })
        .from(weeklyTopics)
        .innerJoin(
          courses,
          and(
            eq(weeklyTopics.courseId, courses.id),
            eq(courses.teacherId, req.user.id)
          )
        )
        .orderBy(weeklyTopics.weekStart);

      res.json(lessonPlans);
    } catch (error) {
      console.error("Failed to fetch all lesson plans:", error);
      res.status(500).json({ message: "Failed to fetch lesson plans" });
    }
  });

  app.delete("/api/courses/:courseId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can delete courses" });
      }

      const courseId = parseInt(req.params.courseId);

      // Verify course exists and belongs to teacher
      const [course] = await db
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, courseId),
            eq(courses.teacherId, req.user.id)
          )
        )
        .limit(1);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Delete related records first
      await db.delete(weeklyTopics).where(eq(weeklyTopics.courseId, courseId));
      await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
      await db.delete(materials).where(eq(materials.courseId, courseId));
      await db.delete(chatMessages).where(eq(chatMessages.courseId, courseId));

      // Finally delete the course
      await db.delete(courses).where(eq(courses.id, courseId));

      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Failed to delete course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  function generateCourseCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  const httpServer = createServer(app);
  return httpServer;
}

async function analyzeMaterial(content: string) {
    //Implementation for analyzeMaterial is needed here.  This is not provided in the original or edited code.
    return {}; // Placeholder return.  Replace with actual analysis logic.
}

async function analyzeTopic(description: string, grade: string, subject: string, standardsSystem: string) {
    //Implementation for analyzeTopic is needed here. This is not provided in the original or edited code.
    return {}; // Placeholder return. Replace with actual analysis logic.
}

async function generateTutorResponse(message: string, courseContext: any, courseMaterials: any){
    //Implementation for generateTutorResponse is needed here.  This is not provided in the original or edited code.
    return {}; // Placeholder return. Replace with actual response generation logic.

}