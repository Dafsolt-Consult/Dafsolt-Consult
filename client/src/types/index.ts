export type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "LIBRARIAN" | "ACCOUNTANT";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: "FREE" | "BASIC" | "PREMIUM";
  currency?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  tenant?: Tenant | null;
  avatarUrl?: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "THEORY" | "FILL_IN_BLANK";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ExamStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "ARCHIVED";

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  classLevelId: string;
  topic?: string | null;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  correctText?: string | null;
  points: number;
  difficulty: Difficulty;
  options: QuestionOption[];
  subject?: { name: string };
  classLevel?: { name: string };
}

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  classLevelId: string;
  sessionId: string;
  termId: string;
  instructions?: string | null;
  durationMinutes: number;
  passMark: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: ExamStatus;
  startAt?: string | null;
  endAt?: string | null;
  subject?: { name: string };
  classLevel?: { name: string };
  _count?: { examQuestions: number; attempts: number };
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  format: "PHYSICAL" | "EBOOK" | "BOTH";
  description?: string | null;
  coverImageUrl?: string | null;
  ebookFileUrl?: string | null;
  targetAudience?: "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY" | null;
  totalCopies: number;
  availableCopies: number;
  category?: { name: string } | null;
}

export interface ClassLevel {
  id: string;
  name: string;
  stage: "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";
  order: number;
  classArms?: ClassArm[];
}

export interface ClassArm {
  id: string;
  name: string;
  classLevelId: string;
  classLevel?: ClassLevel;
  capacity: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  isCore: boolean;
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: Term[];
}

export interface Term {
  id: string;
  sessionId: string;
  name: string;
  isCurrent: boolean;
}

export interface Student {
  id: string;
  admissionNumber: string;
  status: string;
  user: { id: string; email: string; firstName: string; lastName: string; isActive: boolean };
  enrollments?: { classArm: ClassArm & { classLevel: ClassLevel } }[];
}
