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
import { useEffect, useState } from "react";

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
  const { user, headers } = useLoaderData<{ user: User; headers: Headers }>();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProfile = async () => {
    console.log("AAAAA", user, JSON.stringify(headers));
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ full_name: fullName, bio }),
    });
    if (response.ok) {
      window.location.href = "/";
    } else {
      const errorResponse = await response.json();
      setError(
        errorResponse?.error?.message ??
          "Profile creation failed for unknown reason",
      );
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 720, px: 3, py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user.email}
          </Typography>
          <Typography color="text.secondary">
            Create your profile that other Activifind members will see. You can
            edit this later at any time.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box>
              <Stack spacing={3}>
                <Typography variant="h5" component="h2">
                  Create your profile
                </Typography>
                {error && (
                  <Typography color="error">
                    <strong>Error:</strong> {error}
                  </Typography>
                )}
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
                <Button onClick={createProfile} variant="contained">
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
