import {
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { joinedActivities, type Activity } from "~/logic";

export default function ActivityCard({
  activity,
  actions,
}: {
  activity: Activity;
  actions?: ReactNode;
}) {
  const joined = joinedActivities().includes(activity.id);
  return (
    <Card sx={{ width: "100%" }}>
      <CardContent>
        <Typography variant="h5" component="div">
          {activity.title}
        </Typography>
        {activity.description && (
          <Typography variant="body2" color="text.secondary">
            {activity.description}
          </Typography>
        )}
      </CardContent>
      <CardActions
        sx={{ display: "flex", justifyContent: "flex-end", padding: 1 }}
      >
        {actions ??
          (joined ? (
            <Button variant="contained" color="error">
              Leave
            </Button>
          ) : (
            <Button variant="contained" color="primary">
              Join
            </Button>
          ))}
      </CardActions>
    </Card>
  );
}
