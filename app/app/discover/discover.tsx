import { Stack } from "@mui/material";
import ActivityCard from "~/components/ActivityCard";
import { allActivities } from "~/logic";

export function Discover() {
  const activities = allActivities();
  return (
    <Stack spacing={2} className="w-full max-w-xl p-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </Stack>
  );
}
