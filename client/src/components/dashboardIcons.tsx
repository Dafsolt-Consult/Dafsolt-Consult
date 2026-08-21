import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, path: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" {...props}>
      {path}
    </svg>
  );
}

export const AcademicsIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5" />
    </>
  );

export const AssessmentIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="m9.5 13 2 2 3.5-4" />
    </>
  );

export const StudentLifeIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5" />
      <path d="M14.8 15.2c1.9.3 3.3 1.9 3.7 3.8" />
    </>
  );

export const CommunicationIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M3 11a2 2 0 0 1 2-2h1l9-4v14l-9-4H5a2 2 0 0 1-2-2v-2Z" />
      <path d="M15 8a4 4 0 0 1 0 8" />
    </>
  );

export const OperationsIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </>
  );

export const AdminIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M12 3 5 5.5V11c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V5.5L12 3Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </>
  );

export const UsersStatIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5" />
      <path d="M14.8 15.2c1.9.3 3.3 1.9 3.7 3.8" />
    </>
  );

export const AttendanceStatIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="m8.5 14 2 2 4-4" />
    </>
  );

export const FeesStatIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8.5h4.5a2 2 0 0 1 0 4H9m0 0h6M9 12.5v-4M9 12.5V17" />
    </>
  );

export const TrendIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="m3 16 6-6 4 4 7-8" />
      <path d="M15 6h5v5" />
    </>
  );

export const AnnouncementStatIcon = CommunicationIcon;
export const CalendarStatIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <circle cx="8.5" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="15.5" cy="14" r="1" />
    </>
  );

export interface SectionTheme {
  icon: (props: IconProps) => JSX.Element;
  iconWrap: string;
  headerText: string;
  chip: string;
  hex: string;
}

/** One accent color per sidebar section, reused for the dashboard's
 * quick-actions grid so section identity stays visually consistent between
 * the sidebar and the dashboard. Distinct hues (not shades of the single
 * brand green) are deliberate here — this screen's whole job is to say "here
 * is everything you have access to, grouped by kind." */
export const SECTION_THEME: Record<string, SectionTheme> = {
  Academics: {
    icon: AcademicsIcon,
    iconWrap: "bg-blue-50 text-blue-600",
    headerText: "text-blue-700",
    chip: "border-blue-100 hover:border-blue-300 hover:bg-blue-50/60",
    hex: "#2563eb",
  },
  Assessment: {
    icon: AssessmentIcon,
    iconWrap: "bg-violet-50 text-violet-600",
    headerText: "text-violet-700",
    chip: "border-violet-100 hover:border-violet-300 hover:bg-violet-50/60",
    hex: "#7c3aed",
  },
  "Student Life": {
    icon: StudentLifeIcon,
    iconWrap: "bg-rose-50 text-rose-600",
    headerText: "text-rose-700",
    chip: "border-rose-100 hover:border-rose-300 hover:bg-rose-50/60",
    hex: "#e11d48",
  },
  Communication: {
    icon: CommunicationIcon,
    iconWrap: "bg-amber-50 text-amber-600",
    headerText: "text-amber-700",
    chip: "border-amber-100 hover:border-amber-300 hover:bg-amber-50/60",
    hex: "#d97706",
  },
  Operations: {
    icon: OperationsIcon,
    iconWrap: "bg-emerald-50 text-emerald-600",
    headerText: "text-emerald-700",
    chip: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/60",
    hex: "#059669",
  },
  Admin: {
    icon: AdminIcon,
    iconWrap: "bg-indigo-50 text-indigo-600",
    headerText: "text-indigo-700",
    chip: "border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/60",
    hex: "#4f46e5",
  },
};

export const DEFAULT_SECTION_THEME: SectionTheme = {
  icon: OperationsIcon,
  iconWrap: "bg-slate-100 text-slate-600",
  headerText: "text-slate-700",
  chip: "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
  hex: "#475569",
};
