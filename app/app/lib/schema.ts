import * as z from "zod";

export const Uuid = z.uuid();
export type Uuid = z.infer<typeof Uuid>;

export const Category = z.enum([
  "food",
  "sports",
  "study",
  "social",
  "games",
  "other",
]);
export type Category = z.infer<typeof Category>;

export const Profile = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string(),
  bio: z.string().optional(),
  interests: Category.array(),
  created_at: z.date(),
});
export type Profile = z.infer<typeof Profile>;

export const ActivityStatus = z.enum(["open", "cancelled"]);
export type ActivityStatus = z.infer<typeof ActivityStatus>;

export const Activity = z.object({
  id: z.uuid(),
  host_id: z.uuid(),
  title: z.string(),
  description: z.string().optional(),
  category: Category,
  location_name: z.string(),
  start_time: z.date(),
  capacity: z.number().int().positive(),
  is_private: z.boolean(),
  join_code: z.string().optional(),
  created_at: z.date(),
  status: ActivityStatus,
});
export type Activity = z.infer<typeof Activity>;
