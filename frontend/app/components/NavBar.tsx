
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";

import { Link, useRouteLoaderData } from "react-router";
import GoogleSignIn from "./GoogleSignIn";
import type { User } from "@supabase/supabase-js";

type RootLoaderData = {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    };
  } | null;
};

export function NavBar() {
  const data = useRouteLoaderData<{user: User | null}>("root");
  const user = data?.user;

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "transparent",
        color: "primary.main",
        border: "none",
        boxShadow: "none",
      }}
    >
      <Toolbar>
        <span style={{ flex: 1 }} />

        <Typography
          component="span"
          variant="h5"
          sx={{ fontWeight: "bold" }}
        >
          Activifind
        </Typography>

        <Box sx={{ flex: 1, textAlign: "right" }}>
          {user ? (
            <>
              <Button component={Link} to="/">
                Discover
              </Button>

              <Button component={Link} to="/my-activities">
                My activities
              </Button>

              <Button component={Link} to="/create-activity">
                Create activity
              </Button>

              <IconButton component={Link} to="/profile">
                <Avatar src={user.user_metadata?.avatar_url} />
              </IconButton>
              <form 
                action =  "/logout"
                method = "post"
                style = {{display: "inline-block"}}
              >
                <Button type = "submit" color= "error">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <GoogleSignIn />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
