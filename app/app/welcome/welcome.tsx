import { Button, Typography } from "@mui/material";

export function Welcome() {
  return (
    <>
      <Typography component="p">
        Find activities, Join them & Meet new people!
      </Typography>
      <Button variant="contained" color="primary">
        Sign in with Google
      </Button>
    </>
  );
}
