import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import publicRoutes from "./modules/public/public.routes";
import supportRoutes from "./modules/support/support.routes";
import assistantRoutes from "./modules/assistant/assistant.routes";
import platformRoutes from "./modules/platform/platform.routes";
import tenantsRoutes from "./modules/tenants/tenants.routes";
import usersRoutes from "./modules/users/users.routes";
import academicsRoutes from "./modules/academics/academics.routes";
import studentsRoutes from "./modules/students/students.routes";
import teachersRoutes from "./modules/teachers/teachers.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import disciplinaryRoutes from "./modules/disciplinary/disciplinary.routes";
import lessonPlansRoutes from "./modules/lesson-plans/lesson-plans.routes";
import timetableRoutes from "./modules/timetable/timetable.routes";
import scholarshipsRoutes from "./modules/scholarships/scholarships.routes";
import complianceRoutes from "./modules/compliance/compliance.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import transportRoutes from "./modules/transport/transport.routes";
import hostelRoutes from "./modules/hostel/hostel.routes";
import hrRoutes from "./modules/hr/hr.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import resultsRoutes from "./modules/results/results.routes";
import feesRoutes from "./modules/fees/fees.routes";
import cbtRoutes from "./modules/cbt/cbt.routes";
import cbtKioskRoutes from "./modules/cbt/kiosk.routes";
import libraryRoutes from "./modules/library/library.routes";
import parentsRoutes from "./modules/parents/parents.routes";
import assignmentsRoutes from "./modules/assignments/assignments.routes";
import elearningRoutes from "./modules/elearning/elearning.routes";
import alumniRoutes from "./modules/alumni/alumni.routes";
import healthRoutes from "./modules/health/health.routes";
import calendarRoutes from "./modules/calendar/calendar.routes";
import announcementsRoutes from "./modules/announcements/announcements.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";

export function createApp() {
  const app = express();

  // Exactly one reverse-proxy hop in front of this process (Caddy, in the
  // client container — see docker-compose.prod.yml) — needed so req.ip and
  // express-rate-limit's IP-based keying reflect the real client address
  // instead of Caddy's, and so express-rate-limit doesn't reject the
  // X-Forwarded-For header it sets.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" },
  });

  app.use("/uploads", express.static(path.resolve(env.uploadDir)));

  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/platform", platformRoutes);
  app.use("/api/tenants", tenantsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/academics", academicsRoutes);
  app.use("/api/students", studentsRoutes);
  app.use("/api/teachers", teachersRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/disciplinary-records", disciplinaryRoutes);
  app.use("/api/lesson-plans", lessonPlansRoutes);
  app.use("/api/timetable", timetableRoutes);
  app.use("/api/scholarships", scholarshipsRoutes);
  app.use("/api/compliance", complianceRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/transport", transportRoutes);
  app.use("/api/hostel", hostelRoutes);
  app.use("/api/hr", hrRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/results", resultsRoutes);
  app.use("/api/fees", feesRoutes);
  app.use("/api/cbt", cbtRoutes);
  app.use("/api/cbt-kiosk", cbtKioskRoutes);
  app.use("/api/library", libraryRoutes);
  app.use("/api/parents", parentsRoutes);
  app.use("/api/assignments", assignmentsRoutes);
  app.use("/api/elearning", elearningRoutes);
  app.use("/api/alumni", alumniRoutes);
  app.use("/api/health-records", healthRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/announcements", announcementsRoutes);
  app.use("/api/notifications", notificationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
