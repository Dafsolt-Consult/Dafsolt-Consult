export interface CreateStudentInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth?: Date;
  gender?: "MALE" | "FEMALE";
  classArmId: string;
  sessionId: string;
  guardian?: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    relationship: string;
    password?: string;
  };
}

export interface AddGuardianInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary?: boolean;
  password?: string;
}
