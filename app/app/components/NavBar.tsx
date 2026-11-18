import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link } from "react-router";
import { isLoggedIn } from "~/logic";

export function NavBar() {
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
        <span style={{ flex: 1 }}></span>
        <Typography component="span" variant="h5" sx={{ fontWeight: "bold" }}>
          Activifind
        </Typography>
        <Box sx={{ flex: 1, textAlign: "right" }}>
          {isLoggedIn() ? (
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
                <Avatar />
              </IconButton>
            </>
          ) : (
            <Button>Sign in with Google</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
