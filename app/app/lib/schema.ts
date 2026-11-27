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
  full_name: z.string().trim().nonempty("Full name is required").max(80, "Full name must be at most 80 characters"),
  // bio can be null in the database, so treat null as an empty string
  bio: z.string().trim().max(300, "Bio must be at most 300 characters").nullish().transform((bio) => bio ?? ""),
  // stored as an array in Postgres, but duplicates are dropped so it acts like a set
  interests: Category.array().transform((interests) => [...new Set(interests)]),
  created_at: z.coerce.date(),
});
export type Profile = z.infer<typeof Profile>;
export const NewProfile = Profile.pick({
  full_name: true,
  bio: true,
  interests: true,
});
export type NewProfile = z.infer<typeof NewProfile>;

export const ActivityStatus = z.enum(["open", "cancelled"]);
export type ActivityStatus = z.infer<typeof ActivityStatus>;

export const Activity = z.object({
  id: z.uuid(),
  host_id: z.uuid(),
  title: z.string().nonempty("Title is required"),
  description: z.string(),
  category: Category,
  location_name: z.string().nonempty("Location must be specified"),
  start_time: z.coerce.date(),
  capacity: z.number().int().positive("Capacity must be a positive integer"),
  is_private: z.boolean(),
  join_code: z.string().optional(),
  created_at: z.coerce.date(),
  status: ActivityStatus,
});
export type Activity = z.infer<typeof Activity>;
export const NewActivity = Activity.pick({
  title: true,
  description: true,
  category: true,
  location_name: true,
  start_time: true,
  capacity: true,
  is_private: true,
});
export type NewActivity = z.infer<typeof NewActivity>;
