/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        slate: {
          25: "#f8fafc",
          50: "#f5f7fb",
          100: "#e8edf5",
          200: "#d6deea",
          300: "#b4c1d3",
          400: "#7b8aa0",
          500: "#5e6b81",
          600: "#46536a",
          700: "#334158",
          800: "#253247",
          900: "#192539",
        },
        brand: {
          navy: "#1b2756",
          blue: "#5b8def",
          indigo: "#7b6cf6",
          violet: "#a06cf6",
          teal: "#3ecbc7",
          emerald: "#3ed598",
          amber: "#f5b461",
          rose: "#ff7aa2",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass:
          "0 24px 60px -20px rgba(28, 38, 92, 0.35), 0 8px 24px -12px rgba(28, 38, 92, 0.2)",
        "glass-sm":
          "0 12px 30px -12px rgba(28, 38, 92, 0.25), 0 4px 14px -6px rgba(28, 38, 92, 0.15)",
        glow: "0 0 0 1px rgba(255,255,255,0.6) inset, 0 30px 80px -30px rgba(91, 141, 239, 0.5)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
        panel: "0 18px 45px rgba(15, 23, 42, 0.08)",
      },
      backdropBlur: {
        xs: "4px",
        "3xl": "40px",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(1200px 700px at -10% -20%, rgba(123, 108, 246, 0.45), transparent 60%), radial-gradient(900px 600px at 110% 0%, rgba(62, 203, 199, 0.4), transparent 55%), radial-gradient(900px 700px at 50% 110%, rgba(245, 180, 97, 0.35), transparent 60%), linear-gradient(160deg, #eef1ff 0%, #f7f4ff 40%, #effbf6 100%)",
        "mesh-dark":
          "radial-gradient(700px 500px at 20% 0%, rgba(91, 141, 239, 0.35), transparent 60%), radial-gradient(600px 400px at 100% 100%, rgba(160, 108, 246, 0.4), transparent 60%), linear-gradient(180deg, #0b1220 0%, #131a35 100%)",
        "gradient-brand":
          "linear-gradient(135deg, #5b8def 0%, #7b6cf6 50%, #a06cf6 100%)",
        "gradient-warm":
          "linear-gradient(135deg, #f5b461 0%, #ff7aa2 100%)",
        "gradient-cool":
          "linear-gradient(135deg, #3ecbc7 0%, #5b8def 100%)",
        "gradient-mint":
          "linear-gradient(135deg, #3ed598 0%, #3ecbc7 100%)",
      },
    },
  },
  plugins: [],
};
