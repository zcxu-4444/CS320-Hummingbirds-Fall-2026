
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

type FoodRouletteDialogProps = {
  open: boolean;
  onClose: () => void;
  restaurants: string[];
};

const COLORS = [
  "#7136D9",
  "#DDD0F7",
  "#9369DE",
  "#ECE5FB",
  "#512395",
  "#C19FEC",
];

const SIZE = 460;
const CENTER = SIZE / 2;
const RADIUS = 210;
const DURATION = 4500;

function pointAt(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function wedgePath(start: number, end: number) {
  const first = pointAt(start, RADIUS);
  const last = pointAt(end, RADIUS);
  const largeArc = end - start > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${first.x} ${first.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${last.x} ${last.y}`,
    "Z",
  ].join(" ");
}

function splitName(name: string) {
  if (name.length <= 13) return [name];

  const words = name.split(" ");
  if (words.length === 1) return [name];

  const middle = Math.ceil(words.length / 2);

  return [
    words.slice(0, middle).join(" "),
    words.slice(middle).join(" "),
  ];
}

export default function FoodRouletteDialog({
  open,
  onClose,
  restaurants,
}: FoodRouletteDialogProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setRotation(0);
      setSpinning(false);
      setWinner("");
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [open]);

  const count = restaurants.length;
  const sliceAngle = count > 0 ? 360 / count : 0;

  function spinWheel() {
    if (spinning || count < 2) return;

    const selectedIndex = Math.floor(Math.random() * count);

    const currentAngle = ((rotation % 360) + 360) % 360;

    const targetAngle =
      (360 - (selectedIndex + 0.5) * sliceAngle) % 360;

    const difference =
      (targetAngle - currentAngle + 360) % 360;

    setWinner("");
    setSpinning(true);

    setRotation(
      (previous) => previous + 360 * 6 + difference
    );

    timer.current = setTimeout(() => {
      setWinner(restaurants[selectedIndex]);
      setSpinning(false);
      timer.current = null;
    }, DURATION);
  }

  return (
    <Dialog
      open={open}
      onClose={spinning ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "22px",
            bgcolor: "#F8F5FE",
            overflow: "hidden",
            position: "relative",
          },
        },
      }}
    >
      <IconButton
        aria-label="Close roulette"
        onClick={onClose}
        disabled={spinning}
        sx={{
          position: "absolute",
          right: 10,
          top: 10,
          zIndex: 5,
          color: "#8A7A9B",
        }}
      >
        <Close />
      </IconButton>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 3,
          pt: 4,
          pb: 4,
        }}
      >
        {/* WHEEL */}
        <Box
          sx={{
            width: "100%",
            maxWidth: SIZE,
            position: "relative",
          }}
        >
          {/* Fixed pointer */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: "28px solid #512395",
              zIndex: 4,
            }}
          />

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              filter:
                "drop-shadow(0 8px 12px rgba(68,33,102,0.10))",
            }}
          >
            {/* White circular border */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 9}
              fill="#FFFFFF"
            />

            <g
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: `${CENTER}px ${CENTER}px`,
                transition:
                  `transform ${DURATION}ms cubic-bezier(0.12,0.76,0.12,1)`,
              }}
            >
              {count === 1 && (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill={COLORS[0]}
                />
              )}

              {count > 1 &&
                restaurants.map((restaurant, index) => {
                  const start = -90 + index * sliceAngle;
                  const end = start + sliceAngle;
                  const middle = (start + end) / 2;

                  const labelPoint = pointAt(
                    middle,
                    count > 8 ? 155 : 142
                  );

                  const lines = splitName(restaurant);

                  const dark = [0, 2, 4].includes(
                    index % COLORS.length
                  );

                  return (
                    <g key={`${restaurant}-${index}`}>
                      <path
                        d={wedgePath(start, end)}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />

                      {/* Keep restaurant names upright */}
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={dark ? "#FFFFFF" : "#38215D"}
                        fontSize={count > 8 ? 10 : 12}
                        fontWeight={700}
                        style={{
                          transform: `rotate(${-rotation}deg)`,
                          transformOrigin:
                            `${labelPoint.x}px ${labelPoint.y}px`,
                          transition:
                            `transform ${DURATION}ms cubic-bezier(0.12,0.76,0.12,1)`,
                        }}
                      >
                        {lines.map((line, i) => (
                          <tspan
                            key={i}
                            x={labelPoint.x}
                            dy={
                              i === 0
                                ? -(lines.length - 1) * 7
                                : 14
                            }
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
            </g>

            {/* Center circle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={42}
              fill="#FFFFFF"
            />

            <text
              x={CENTER}
              y={CENTER - 5}
              textAnchor="middle"
              fill="#6845A6"
              fontSize={9}
              letterSpacing={1}
            >
              LET'S
            </text>

            <text
              x={CENTER}
              y={CENTER + 19}
              textAnchor="middle"
              fill="#7136D9"
              fontSize={23}
              fontWeight={800}
            >
              eat!
            </text>
          </svg>
        </Box>

        {/* SPIN BUTTON */}
        <Button
          variant="contained"
          onClick={spinWheel}
          disabled={spinning || count < 2}
          sx={{
            bgcolor: "#7136D9",
            mt: 2,
            width: 250,
            maxWidth: "90%",
            borderRadius: "13px",
            py: 1.5,
            fontSize: 16,
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              bgcolor: "#512395",
            },
          }}
        >
          {spinning ? "Spinning..." : "Spin the wheel"}
        </Button>

        <Typography
          sx={{
            mt: 1,
            color: "#88799D",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {count} restaurants. One delicious decision.
        </Typography>

        {winner && (
          <Typography
            role="status"
            sx={{
              mt: 2,
              fontSize: 20,
              fontWeight: 800,
              color: "#512395",
              textAlign: "center",
            }}
          >
            Winner: {winner}!
          </Typography>
        )}
      </Box>
    </Dialog>
  );
}
