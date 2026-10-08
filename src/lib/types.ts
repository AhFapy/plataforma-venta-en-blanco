export type Role = "alumno" | "mentor" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  active: boolean;
  cohort: string | null;
  enrolled_at: string;
  phone: string | null;
  bio: string | null;
  situation: string | null;
  goal: string | null;
  weekly_hours: number | null;
  objectives: string[];
  improvements: string[];
  onboarded_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type Course = { id: string; title: string; description: string | null; cover_url: string | null; position: number; published: boolean };
export type Module = { id: string; course_id: string; title: string; description: string | null; position: number; unlock_mode: "libre" | "progreso" | "fecha"; unlock_after_days: number };
export type Lesson = { id: string; module_id: string; title: string; description: string | null; duration_min: number | null; position: number; published: boolean; updated_at: string };
export type LessonMedia = { lesson_id: string; video_url: string | null; resources: { label: string; url: string }[] };
export type Channel = { id: string; slug: string; name: string; description: string | null; emoji: string | null; position: number; staff_only_post: boolean; is_wins: boolean };
export type EventRow = { id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; meeting_url: string | null; recording_url: string | null };
