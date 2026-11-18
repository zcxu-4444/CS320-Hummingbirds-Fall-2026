import { Stack, Typography } from "@mui/material";
import ActivityCard from "~/components/ActivityCard";
import { allActivities, currentUser, joinedActivities } from "~/logic";

export function MyActivities() {
  const me = currentUser();
  const joined = joinedActivities();
  // Activities the user has joined or is hosting, soonest first.
  const activities = allActivities()
    .filter((a) => joined.includes(a.id) || a.host_id === me?.id)
    .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());

  return (
    <Stack spacing={2} className="w-full max-w-xl p-4">
      {activities.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center" }}>
          You haven't joined any activities yet.
        </Typography>
      ) : (
        activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))
      )}
    </Stack>
  );
}
