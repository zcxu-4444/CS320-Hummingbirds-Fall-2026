import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  Radio,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";

import type {
  PollOption,
  Restaurant,
} from "../services/food";

type Props = {
  open: boolean;
  onClose: () => void;
  options: PollOption[];
  catalogRestaurants?: Restaurant[];
  isClosed?: boolean;
  canEdit?: boolean;
  onVote: (optionId: string) => Promise<void>;
  onAddOption?: (restaurantId: string) => Promise<void>;
};

const COLORS = [
  "#7136D9",
  "#DDD0F7",
  "#9369DE",
  "#ECE5FB",
  "#512395",
  "#C19FEC",
];

export default function FoodPollDialog({
  open,
  onClose,
  options,
  catalogRestaurants = [],
  isClosed = false,
  canEdit = false,
  onVote,
  onAddOption,
}: Props) {
  const [input, setInput] = useState("");
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [hiddenNames, setHiddenNames] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) {
      setInput("");
      setCustomNames([]);
      setHiddenNames([]);
      setSelected("");
      setError("");
      setSuccess("");
    }
  }, [open]);

  // Show catalog restaurants, saved poll options,
  // and any local preview entries.
  const restaurants = useMemo(() => {
    const names = new Map<string, string>();

    for (const restaurant of catalogRestaurants) {
      names.set(
        restaurant.name.toLowerCase(),
        restaurant.name
      );
    }

    for (const option of options) {
      if (option.restaurant?.name) {
        names.set(
          option.restaurant.name.toLowerCase(),
          option.restaurant.name
        );
      }
    }

    for (const name of customNames) {
      names.set(name.toLowerCase(), name);
    }

    return [...names.values()].filter(
      (name) =>
        !hiddenNames.some(
          (hidden) =>
            hidden.toLowerCase() === name.toLowerCase()
        )
    );
  }, [
    catalogRestaurants,
    options,
    customNames,
    hiddenNames,
  ]);

  function findOption(name: string) {
    return options.find(
      (option) =>
        option.restaurant?.name.toLowerCase() ===
        name.toLowerCase()
    );
  }

  // Add an existing catalog restaurant to the poll
  // through the API, or add a custom name to the preview.
  async function addRestaurant() {
    const name = input.trim();

    if (!name || busy || isClosed) return;

    setError("");
    setSuccess("");

    const savedOption = findOption(name);

    if (savedOption) {
      setError(
        "This restaurant is already an option in this poll."
      );
      return;
    }

    const catalogMatch = catalogRestaurants.find(
      (restaurant) =>
        restaurant.name.toLowerCase() === name.toLowerCase()
    );

    if (catalogMatch) {
      if (!canEdit || !onAddOption) {
        setError(
          "Only the activity host can add this restaurant " +
          "as a voting option."
        );
        return;
      }

      setBusy(true);

      try {
        await onAddOption(catalogMatch.id);

        setHiddenNames((previous) =>
          previous.filter(
            (item) =>
              item.toLowerCase() !== name.toLowerCase()
          )
        );

        setInput("");
        setSuccess("Restaurant added to the poll!");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not add restaurant to the poll."
        );
      } finally {
        setBusy(false);
      }

      return;
    }

    const alreadyVisible = restaurants.some(
      (restaurant) =>
        restaurant.toLowerCase() === name.toLowerCase()
    );

    if (alreadyVisible) {
      setError("This restaurant is already on the list.");
      return;
    }

    // Unknown names are frontend preview entries only.
    setCustomNames((previous) => [...previous, name]);

    setHiddenNames((previous) =>
      previous.filter(
        (item) =>
          item.toLowerCase() !== name.toLowerCase()
      )
    );

    setInput("");
    setSuccess(
      "Added to preview only. This restaurant " +
      "is not yet available for voting."
    );
  }

  // The X button hides a name locally.
  // It does not delete anything from Supabase.
  function removeRestaurant(name: string) {
    if (busy || isClosed) return;

    setCustomNames((previous) =>
      previous.filter(
        (item) =>
          item.toLowerCase() !== name.toLowerCase()
      )
    );

    setHiddenNames((previous) => [...previous, name]);

    if (selected === name) {
      setSelected("");
    }

    setError("");
    setSuccess("Restaurant hidden from this preview.");
  }

  async function submitVote() {
    if (!selected || busy || isClosed) return;

    const option = findOption(selected);

    if (!option) {
      setError(
        "This restaurant has not been added " +
        "to the activity's poll yet."
      );
      return;
    }

    if (option.voted_by_me) {
      setError(
        "You have already voted for this restaurant."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      await onVote(option.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit vote."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "18px",
            p: 2.5,
            bgcolor: "#FFFFFF",
          },
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          aria-label="Close food poll"
          onClick={onClose}
          disabled={busy}
          sx={{
            position: "absolute",
            top: -12,
            right: -12,
            color: "#9786A7",
          }}
        >
          <Close />
        </IconButton>

        {/* HEADER */}
        <Box sx={{ pt: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 800,
                color: "#30204E",
              }}
            >
              On the menu
            </Typography>

            <Box
              sx={{
                bgcolor: "#F0E7FF",
                color: "#7136D9",
                borderRadius: "20px",
                px: 1.3,
                py: 0.5,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {restaurants.length} choices
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: 12,
              color: "#88799D",
              mt: 0.3,
              mb: 2,
            }}
          >
            Your favorites, all in one place.
          </Typography>
        </Box>

        {/* ADD RESTAURANT */}
        {!isClosed && (
          <Box
            sx={{
              display: "flex",
              gap: 0.8,
              mb: 2.4,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Enter a restaurant name"
              value={input}
              disabled={busy}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void addRestaurant();
                }
              }}
              slotProps={{
                htmlInput: {
                  maxLength: 32,
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  height: 40,
                  borderRadius: "10px",
                  fontSize: 13,
                },
              }}
            />

            <Button
              variant="contained"
              aria-label="Add restaurant"
              onClick={() => void addRestaurant()}
              disabled={!input.trim() || busy}
              sx={{
                minWidth: 40,
                height: 40,
                p: 0,
                bgcolor: "#7136D9",
                borderRadius: "10px",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#512395",
                },
              }}
            >
              <Add />
            </Button>
          </Box>
        )}

        {/* LIST HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 0.7,
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: "#88799D",
            }}
          >
            RESTAURANT
          </Typography>

          <Typography
            sx={{
              fontSize: 10,
              color: "#88799D",
              fontWeight: 800,
            }}
          >
            {restaurants.length} CHOICES
          </Typography>
        </Box>

        {/* RESTAURANT LIST */}
        <Box
          sx={{
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {restaurants.map((name, index) => {
            const option = findOption(name);

            const canVote =
              Boolean(option) &&
              !option?.voted_by_me &&
              !isClosed &&
              !busy;

            return (
              <Box
                key={name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minHeight: 39,
                  px: 0.6,
                  borderRadius: "7px",
                  bgcolor:
                    selected === name
                      ? "#F0E7FF"
                      : index % 2 === 0
                        ? "#F9F6FC"
                        : "#FFFFFF",
                }}
              >
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor:
                      COLORS[index % COLORS.length],
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    color: "#38254F",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </Typography>

                {option && (
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "#88799D",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.vote_count} votes
                  </Typography>
                )}

                <Radio
                  size="small"
                  checked={selected === name}
                  disabled={!canVote}
                  onChange={() => {
                    setSelected(name);
                    setError("");
                  }}
                  slotProps={{
                    input: {
                      "aria-label": `Select ${name}`,
                    },
                  }}
                  sx={{
                    p: 0.3,
                    color: "#C6B6D9",
                    "&.Mui-checked": {
                      color: "#7136D9",
                    },
                  }}
                />

                {!isClosed && (
                  <IconButton
                    size="small"
                    disabled={busy}
                    aria-label={`Hide ${name} from preview`}
                    onClick={() => removeRestaurant(name)}
                    sx={{
                      color: "#9786A7",
                      p: 0.4,
                    }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            borderTop: "1px solid #EEE7F4",
            mt: 2,
            pt: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: "#88799D",
              mb: 1,
            }}
          >
            {isClosed
              ? "This poll is closed. Voting is unavailable."
              : "Select a saved poll option to vote."}
          </Typography>

          <Typography
            sx={{
              fontSize: 11,
              color: "#88799D",
              mb: 2,
            }}
          >
            Only saved poll options can receive votes.
            Hiding a restaurant changes this preview only.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            disabled={
              busy ||
              isClosed ||
              !selected ||
              !findOption(selected) ||
              Boolean(findOption(selected)?.voted_by_me)
            }
            onClick={() => void submitVote()}
            sx={{
              bgcolor: "#7136D9",
              borderRadius: "10px",
              py: 1.3,
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#512395",
              },
            }}
          >
            {busy
              ? "Submitting..."
              : isClosed
                ? "Poll Closed"
                : "Submit Vote"}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
