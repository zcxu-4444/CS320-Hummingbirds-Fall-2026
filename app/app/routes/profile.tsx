import { useState, type FormEvent } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Route } from "./+types/profile";
import { currentProfile, type Profile } from "~/logic";
import { requireFullProfile } from "~/auth.server";
import { data } from "react-router";

type ProfileForm = {
  full_name: string;
  bio: string;
};

function profileToForm(profile: Profile): ProfileForm {
  return {
    full_name: profile.full_name ?? "",
    bio: profile.bio ?? "",
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireFullProfile(request);

  return data(
    {
      email: user.email ?? "",
      name: user.user_metadata?.full_name ?? "Not provided",
    },
    { headers: responseHeaders },
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Activifind" },
    { name: "description", content: "View and edit your Activifind profile." },
  ];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(() =>
    currentProfile(),
  );
  const [form, setForm] = useState<ProfileForm>(() =>
    profile ? profileToForm(profile) : { full_name: "", bio: "" },
  );
  const [isEditing, setIsEditing] = useState(false);

  if (!profile) {
    return (
      <Box sx={{ width: "100%", maxWidth: 720, px: 3, py: 5 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>
        <Typography color="text.secondary">
          Your profile information is not available.
        </Typography>
      </Box>
    );
  }

  function startEditing() {
    if (!profile) return;
    setForm(profileToForm(profile));
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!profile) return;
    setForm(profileToForm(profile));
    setIsEditing(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfile((current) =>
      current
        ? {
            ...current,
            full_name: form.full_name.trim(),
            bio: form.bio.trim(),
          }
        : current,
    );
    setIsEditing(false);
  }

  // FIXME: once this uses the actual profile data, it should reuse the avatar provided by auth
  // (like in navbar)
  const initials = profile.full_name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Box sx={{ width: "100%", maxWidth: 720, px: 3, py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Your profile
          </Typography>
          <Typography color="text.secondary">
            Manage the information other Activifind members see about you.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {isEditing ? (
              <Box component="form" onSubmit={saveProfile}>
                <Stack spacing={3}>
                  <Typography variant="h5" component="h2">
                    Edit profile
                  </Typography>
                  <TextField
                    label="Full name"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                    required
                    fullWidth
                  />
                  <TextField
                    label="Bio"
                    value={form.bio}
                    onChange={(event) =>
                      setForm({ ...form, bio: event.target.value })
                    }
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button onClick={cancelEditing}>Cancel</Button>
                    <Button type="submit" variant="contained">
                      Save changes
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: "flex-start", sm: "center" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: "primary.main",
                      fontSize: 28,
                    }}
                  >
                    {initials || "?"}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" component="h2">
                      {profile.full_name || "Your name"}
                    </Typography>
                    <Typography color="text.secondary">
                      {profile.email}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={startEditing}>
                    Edit profile
                  </Button>
                </Stack>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bio
                  </Typography>
                  <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                    {profile.bio || "Add a short bio to introduce yourself."}
                  </Typography>
                </Box>

                {profile.created_at && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Member since
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {profile.created_at.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
