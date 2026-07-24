export type UserRole =
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "LIBRARIAN"
  | "ACCOUNTANT"
  | "NURSE"
  | "HR_MANAGER"
  | "TRANSPORT_OFFICER"
  | "HOSTEL_WARDEN";

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
  // Set only when this session was minted by a platform admin's
  // impersonation session (see /platform), not a real login.
  impersonatedBy?: string | null;
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

export type ExamBoard = "WAEC" | "NECO" | "UTME" | "GENERAL";
export type SchoolStage = "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";

export interface GlobalSubject {
  id: string;
  name: string;
  code: string;
}

export interface GlobalQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface GlobalQuestion {
  id: string;
  globalSubjectId: string;
  examBoard: ExamBoard;
  stage: SchoolStage;
  topic?: string | null;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  correctText?: string | null;
  points: number;
  difficulty: Difficulty;
  options: GlobalQuestionOption[];
  globalSubject?: { name: string; code: string };
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
  category?: { id: string; name: string } | null;
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
  formTeacherId?: string | null;
  formTeacher?: Teacher | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  isCore: boolean;
}

export interface Teacher {
  id: string;
  staffId: string;
  qualification?: string | null;
  user: { firstName: string; lastName: string; email: string };
}

export interface ClassArmSubject {
  id: string;
  classArmId: string;
  subjectId: string;
  teacherId?: string | null;
  sessionId: string;
  termId: string;
  subject?: Subject;
  teacher?: Teacher | null;
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
  relationship?: string;
  isPrimary?: boolean;
}

export type DisciplinaryCategory = "MINOR" | "MAJOR" | "SEVERE";
export type DisciplinaryStatus = "OPEN" | "RESOLVED";

export interface DisciplinaryRecord {
  id: string;
  studentId: string;
  category: DisciplinaryCategory;
  incidentDate: string;
  description: string;
  actionTaken?: string | null;
  status: DisciplinaryStatus;
  createdAt: string;
  student?: { user: { firstName: string; lastName: string } };
}

export interface HealthRecord {
  id: string;
  studentId: string;
  bloodGroup?: string | null;
  genotype?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  medications?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  physicianName?: string | null;
  physicianPhone?: string | null;
  notes?: string | null;
  updatedAt: string;
}

export interface HealthIncident {
  id: string;
  studentId: string;
  incidentDate: string;
  description: string;
  actionTaken?: string | null;
  createdAt: string;
  student?: { user: { firstName: string; lastName: string } };
}

export interface LessonPlan {
  id: string;
  classArmId: string;
  subjectId: string;
  teacherId: string;
  termId: string;
  topic: string;
  objectives?: string | null;
  content?: string | null;
  attachmentUrl?: string | null;
  date: string;
  subject?: Subject;
  classArm?: ClassArm & { classLevel: ClassLevel };
  teacher?: { user: { firstName: string; lastName: string } };
}

export interface TimetablePeriod {
  id: string;
  classArmId: string;
  subjectId: string;
  teacherId?: string | null;
  termId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject?: { name: string };
  classArm?: ClassArm & { classLevel: ClassLevel };
  teacher?: { user: { firstName: string; lastName: string } } | null;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId?: string;
  studentId: string;
  submissionText?: string | null;
  attachmentUrl?: string | null;
  submittedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  student?: { user: { firstName: string; lastName: string } };
}

export interface Assignment {
  id: string;
  classArmId: string;
  subjectId: string;
  title: string;
  description?: string | null;
  attachmentUrl?: string | null;
  dueDate: string;
  totalPoints: number;
  subject?: { name: string };
  classArm?: ClassArm & { classLevel: ClassLevel };
  _count?: { submissions: number };
  submissions?: AssignmentSubmission[];
  mySubmission?: AssignmentSubmission | null;
}

export type MaterialType = "DOCUMENT" | "VIDEO" | "LINK" | "OTHER";

export interface CourseMaterial {
  id: string;
  classArmId: string;
  subjectId: string;
  title: string;
  description?: string | null;
  type: MaterialType;
  url: string;
  createdAt: string;
  subject?: { name: string };
  classArm?: ClassArm & { classLevel: ClassLevel };
}

export interface OnlineClassSession {
  id: string;
  classArmId: string;
  subjectId: string;
  title: string;
  meetingUrl: string;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  subject?: { name: string };
  classArm?: ClassArm & { classLevel: ClassLevel };
}

export interface Alumnus {
  id: string;
  studentId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  graduationYear: number;
  lastClassLevelId?: string | null;
  lastClassLevel?: ClassLevel | null;
  higherInstitution?: string | null;
  occupation?: string | null;
  employer?: string | null;
  bio?: string | null;
}

export type CalendarEventType = "HOLIDAY" | "EXAM" | "ACADEMIC" | "EVENT" | "MEETING";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: CalendarEventType;
  startDate: string;
  endDate?: string | null;
}

export type AnnouncementAudience = "ALL" | "STAFF" | "PARENTS" | "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string;
  createdBy?: { firstName: string; lastName: string };
}

export interface AppNotification {
  id: string;
  subject?: string | null;
  message: string;
  createdAt: string;
  readAt?: string | null;
}

export interface ResultEntry {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade?: string | null;
  remark?: string | null;
  subject: { name: string };
}

export interface ReportCard {
  id: string;
  daysPresent: number;
  daysAbsent: number;
  position?: number | null;
  classTeacherComment?: string | null;
  principalComment?: string | null;
  classArm?: ClassArm & { classLevel: ClassLevel };
}

export interface Invoice {
  id: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  feeStructure: { name: string };
}
