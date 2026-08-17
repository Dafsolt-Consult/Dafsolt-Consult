import { Link } from "react-router-dom";

/**
 * DRAFT — generated from the app's actual feature set as a starting point
 * for the school's/Dafsolt's legal review. Not legal advice. Must be
 * reviewed and signed off before this app goes live on Google Play.
 */
export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <Link to="/" className="text-lg font-semibold text-[#2E3192]">
          Dafsolt BOS
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 text-slate-700">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: 17 August 2026 — draft, pending review</p>

        <p className="mt-6">
          Dafsolt BOS for School ("the App") is a school management platform used by schools ("the School", "the
          Customer") to administer academics, finance, computer-based testing (CBT), human resources, communication,
          and day-to-day operations. This policy explains what information the App handles and how, on behalf of the
          Schools that use it.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Who controls this data</h2>
        <p className="mt-2">
          Each School is the data controller for the information it enters into the App — students, guardians, and
          staff. Dafsolt acts as a data processor, storing and processing that information only to provide the
          service the School has configured. We do not sell any data collected through the App.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Information we process</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>
            <strong>Student records:</strong> name, date of birth, class/grade level, attendance, academic results,
            CBT exam attempts and scores, disciplinary records, and — where a School enables the module — health
            records.
          </li>
          <li>
            <strong>Guardian/parent information:</strong> name, phone number, email, and relationship to student, used
            for communication and the parent portal.
          </li>
          <li>
            <strong>Staff information:</strong> name, contact details, role, employment records, attendance, and —
            where payroll is enabled — salary figures entered by the School.
          </li>
          <li>
            <strong>Financial records:</strong> fee schedules and payment records the School enters or reconciles
            through the App.
          </li>
          <li>
            <strong>Account &amp; device information:</strong> login email/phone, authentication tokens, and basic
            device/browser information needed to keep a session secure.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">How this information is used</h2>
        <p className="mt-2">
          Solely to provide the App's functionality to the School that entered it: displaying records to
          authorized users (based on their role — e.g. a teacher sees their classes, a parent sees their own
          child), generating reports, sending notifications, and processing CBT exam attempts. Data entered by one
          School is never visible to another School.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Children's data</h2>
        <p className="mt-2">
          Student accounts and records are created and managed by the School, not signed up directly by children
          through the Play Store. Devices used for CBT exam kiosks are School-owned and School-managed, not personal
          installs. Schools are responsible for obtaining any consent required under local law before entering a
          student's information into the App.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Data retention</h2>
        <p className="mt-2">
          Data is retained for as long as the School's account is active, and for a reasonable period after
          termination to allow the School to export records, unless the School requests earlier deletion.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Security</h2>
        <p className="mt-2">
          Access is role-based and scoped per School (tenant); connections to the App are encrypted in transit.
          Only School staff with the appropriate role can view or edit a given record type.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">Contact</h2>
        <p className="mt-2">
          Questions about this policy, or requests to access/delete data, should be directed to the School
          administrator first, or to Dafsolt directly at{" "}
          <a href="mailto:privacy@dafsolt.cloud" className="text-[#2E3192] underline">
            privacy@dafsolt.cloud
          </a>
          .
        </p>
      </main>
    </div>
  );
}
