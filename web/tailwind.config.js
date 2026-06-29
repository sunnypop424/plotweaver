/** @type {import('tailwindcss').Config} */
// 토큰 출처: DESIGN.md (Laftel) — 색·폰트·라운드를 단일 출처로 둔다.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#816bff",
        "brand-hover": "#6e58ff",
        wash: "#f0edff",
        "wash-2": "#d9d3ff",
        "wash-border": "#e3ddff",
        ink: "#121212",
        ink2: "#505050",
        muted: "#8a8a8a",
        hairline: "#eeeeee",
        line2: "#e3e3e3",
        error: "#f16361",
        "error-wash": "#fff1f1",
        toast: "#242537",
        canvas: "#f7f7f7",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(129,107,255,0.15)",
        "focus-error": "0 0 0 3px rgba(241,99,97,0.16)",
        card: "0 1px 4px rgba(0,0,0,0.10)",
        pop: "0 6px 20px rgba(0,0,0,0.14)",
        toast: "0 8px 24px rgba(0,0,0,0.22)",
        cta: "0 4px 14px rgba(129,107,255,0.35)",
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        "toast-in": {
          from: { opacity: "0", transform: "translate(-50%,14px)" },
          to: { opacity: "1", transform: "translate(-50%,0)" },
        },
      },
      animation: {
        spin: "spin .8s linear infinite",
        "toast-in": "toast-in .2s ease",
      },
    },
  },
  plugins: [],
};
