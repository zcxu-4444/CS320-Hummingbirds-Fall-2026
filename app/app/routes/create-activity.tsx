import type { Route } from "./+types/create-activity";
import { useState, type FormEvent } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ActivityCard from "~/components/ActivityCard";
import { currentUser, type Activity } from "~/logic";

type ActivityForm = {
  title: string;
  description: string;
  category: string;
  location: string;
  startTime: string;
  capacity: string;
};

const emptyForm: ActivityForm = {
  title: "",
  description: "",
  category: "",
  location: "",
  startTime: "",
  capacity: "10",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Activity - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function CreateActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = currentUser();

    setActivities((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        host_id: user?.id ?? "",
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        location_name: form.location.trim(),
        start_time: new Date(form.startTime),
        capacity: Number(form.capacity),
        is_private: false,
        created_at: new Date(),
      },
    ]);
    setForm(emptyForm);
    setDialogOpen(false);
  }

  function closeDialog() {
    setDialogOpen(false);
    setForm(emptyForm);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{
          mb: 3,
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Typography variant="h4" component="h1">
          Create activities
        </Typography>
        <Typography color="text.secondary">
          Activities created: {activities.length}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 2,
          alignItems: "stretch",
        }}
      >
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            actions={
              <Button
                color="error"
                onClick={() =>
                  setActivities((current) =>
                    current.filter((item) => item.id !== activity.id),
                  )
                }
              >
                Remove
              </Button>
            }
          />
        ))}

        <Card
          variant="outlined"
          sx={{
            minHeight: 150,
            borderStyle: "dashed",
            display: "grid",
            placeItems: "center",
          }}
        >
          <CardContent>
            <Button
              onClick={() => setDialogOpen(true)}
              aria-label="Add an activity"
              sx={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                color: "text.secondary",
              }}
            >
              <Box component="span" sx={{ fontSize: 44, lineHeight: 1 }}>
                +
              </Box>
              <Box component="span">Add activity</Box>
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={addActivity}>
          <DialogTitle>New activity</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Activity name"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                required
                autoFocus
                fullWidth
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label="Category"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Location"
                value={form.location}
                onChange={(event) =>
                  setForm({ ...form, location: event.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Date and time"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) =>
                  setForm({ ...form, startTime: event.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
              <TextField
                label="Capacity"
                type="number"
                value={form.capacity}
                onChange={(event) =>
                  setForm({ ...form, capacity: event.target.value })
                }
                slotProps={{ htmlInput: { min: 1 } }}
                required
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add activity
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
