export type Activity = {
  id: Uuid;
  host_id: Uuid;
  title: string;
  description?: string;
  category: string;
  location_name: string;
  start_time: Date;
  capacity: number;
  is_private: boolean;
  join_code?: string;
  created_at: Date;
};

export type Uuid = string;

export function isLoggedIn(): boolean {
  // TODO: implement auth
  return true;
}

export function allActivities(): Activity[] {
  // TODO: return real data
  return [
    {
      id: "1",
      host_id: "1",
      title: "Hiking Near Campus",
      description: "Fun sunset hike.",
      category: "Outdoor",
      location_name: "Mt. Sugarloaf",
      start_time: new Date("2026-11-10T20:00:00Z"),
      capacity: 10,
      is_private: false,
      created_at: new Date("2026-11-08T14:00:00Z"),
    },
    {
      id: "2",
      host_id: "2",
      title: "Cooking Class",
      description: "Learn to cook at UMass Dining.",
      category: "Food",
      location_name: "Worcester Commons",
      start_time: new Date("2026-11-09T18:00:00Z"),
      capacity: 15,
      is_private: false,
      created_at: new Date("2026-11-08T14:00:00Z"),
    },
  ];
}
