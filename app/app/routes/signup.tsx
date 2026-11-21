import type { Route } from "./+types/signup";
import { currentProfile, type Profile } from "~/logic";
import { requireAuth } from "~/auth.server";
import { data, useLoaderData } from "react-router";
import type { User } from "@supabase/supabase-js";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireAuth(request);
  return data({ user }, { headers: responseHeaders });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - Activifind" },
    { name: "description", content: "Create your Activifind profile." },
  ];
}

export default function SignupPage() {
  const { user } = useLoaderData<{ user: User }>();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const createProfile = () => {};

  return (
    <Box sx={{ width: "100%", maxWidth: 720, px: 3, py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Sign up
          </Typography>
          <Typography color="text.secondary">
            Create your profile that other Activifind members will see. You can
            edit this later at any time.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box component="form" onSubmit={createProfile}>
              <Stack spacing={3}>
                <Typography variant="h5" component="h2">
                  Create your profile
                </Typography>
                <TextField
                  label="Full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
                <Button type="submit" variant="contained">
                  Create
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
