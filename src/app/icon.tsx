import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "#fbbf24",
          color: "#06101d",
          fontSize: 38,
          fontWeight: 900,
          letterSpacing: -2,
        }}
      >
        E
      </div>
    ),
    {
      ...size,
    },
  );
}
