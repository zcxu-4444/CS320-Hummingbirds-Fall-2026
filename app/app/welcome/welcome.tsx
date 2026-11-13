import { Typography } from "@mui/material";
import GoogleSignIn from "../components/GoogleSignIn";

export function Welcome() {
  return (
    <>
      <Typography component="p">
        Find activities, Join them & Meet new people!
      </Typography>

      <GoogleSignIn />
    </>
  );
}
