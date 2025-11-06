import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6b21a8, #9333ea)",
          borderRadius: 8,
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        SD
      </div>
    ),
    { ...size }
  );
}
