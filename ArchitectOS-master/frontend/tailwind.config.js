/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"] ,
  theme: {
    extend: {
      colors: {
        bg: "#0b0c10",             // Dark blueprint-style page background
        surface: "#16181d",        // Dark charcoal container surface
        surfaceHover: "#21242c",   // Lighter dark gray for hovered controls
        accent: "#3b82f6",         // Vibrant enterprise blue
        accentLight: "#1e293b",    // Deep navy blue zone/message highlight
        textPrimary: "#f3f4f6",    // Off-white primary text
        textSecondary: "#9ca3af",  // Medium slate gray secondary text
        borderMuted: "#2a2c35",    // Clean, dark gray border
      },
      borderRadius: {
        xl: "0px",                 // Sharp rectangular boxes for enterprise diagrams
      },
    },
  },
  plugins: [],
};
