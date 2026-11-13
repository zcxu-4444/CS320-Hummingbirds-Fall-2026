
import { Button } from "@mui/material";

export default function GoogleSignIn() {
  return (
    <form action="/auth/google" method="post">
      <Button
        type="submit"
        variant="contained"
        color="primary"
      >
        Sign in with Google
      </Button>
    </form>
  );
}
