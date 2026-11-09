import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";
import type { Activity } from "~/logic";

export default function ActivityCard({ activity }: { activity: Activity }) {
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
      <CardActionArea
        sx={{ display: "flex", justifyContent: "flex-end", padding: 1 }}
      >
        <Button variant="contained" color="primary">
          Join
        </Button>
      </CardActionArea>
    </Card>
  );
}
