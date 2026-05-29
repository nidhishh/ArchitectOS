/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"] ,
  theme: {
    extend: {
      colors: {
        bg: "#0F1117",
        surface: "#151922",
        accent: "#4F8CFF",
        accent2: "#8A63FF",
        textPrimary: "#FFFFFF",
        textSecondary: "#A1A7B3",
      },
      borderRadius: {
        xl: "16px",
      },
    },
  },
  plugins: [],
};
