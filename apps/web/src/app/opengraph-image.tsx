import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0b13",
          backgroundImage: "radial-gradient(circle at 50% 30%, rgba(101,111,235,0.35), transparent 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255,255,255,0.06)",
            marginBottom: 40,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#7c86f2" strokeWidth="2">
            <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#ffffff", letterSpacing: -1 }}>
          AI QA Agent
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#9d9bb0", marginTop: 16 }}>
          Autonomous QA &amp; Production Readiness
        </div>
      </div>
    ),
    { ...size },
  );
}
