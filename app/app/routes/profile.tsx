import { useState, type FormEvent } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Route } from "./+types/profile";
import type { Profile } from "~/logic";
import { requireFullProfile } from "~/auth.server";
import { data } from "react-router";

const INTEREST_OPTIONS = ["food", "sports", "study", "social", "games", "other"];

type ProfileForm = {
  full_name: string;
  bio: string;
  interests: string[];
};

function profileToForm(profile: Profile): ProfileForm {
  return {
    full_name: profile.full_name ?? "",
    bio: profile.bio ?? "",
    interests: profile.interests ?? [],
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { profile, responseHeaders } = await requireFullProfile(request);

  return data({ profile: profile as Profile }, { headers: responseHeaders });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Activifind" },
    { name: "description", content: "View and edit your Activifind profile." },
  ];
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const [profile, setProfile] = useState<Profile | null>(loaderData.profile);
  const [form, setForm] = useState<ProfileForm>(() =>
    profile ? profileToForm(profile) : { full_name: "", bio: "", interests: [] },
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!profile) return;
    setForm(profileToForm(profile));
    setSaveError(null);
    setIsEditing(false);
  }

  function toggleInterest(interest: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((i) => i !== interest)
        : [...current.interests, interest],
    }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          bio: form.bio,
          interests: form.interests,
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        const fieldErrors = json?.error?.fields ? Object.values(json.error.fields).join(" ") : "";
        setSaveError(fieldErrors || json?.error?.message || "Couldn't save your profile");
        return;
      }

      setProfile(json.profile);
      setIsEditing(false);
    } catch {
      setSaveError("Couldn't reach the server, try again");
    } finally {
      setIsSaving(false);
    }
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
                  {saveError && <Alert severity="error">{saveError}</Alert>}
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
                    slotProps={{ htmlInput: { maxLength: 300 } }}
                  />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Interests
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                      {INTEREST_OPTIONS.map((interest) => {
                        const selected = form.interests.includes(interest);
                        return (
                          <Chip
                            key={interest}
                            label={interest}
                            clickable
                            color={selected ? "primary" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            onClick={() => toggleInterest(interest)}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button onClick={cancelEditing} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
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

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Interests
                  </Typography>
                  {profile.interests && profile.interests.length > 0 ? (
                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
                      {profile.interests.map((interest) => (
                        <Chip key={interest} label={interest} color="primary" variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ mt: 0.5 }}>Add interests so we can show you activities you'll like.</Typography>
                  )}
                </Box>

                {profile.created_at && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Member since
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {new Date(profile.created_at).toLocaleDateString(undefined, {
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
