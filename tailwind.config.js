/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#01696f",
          hover: "#0c4e54",
          highlight: "#cedcd8",
        },
        background: {
          light: "#f7f6f2",
          dark: "#171614",
        },
        surface: {
          light: "#f9f8f5",
          dark: "#1c1b19",
        },
        muted: {
          light: "#e8e7e3",
          dark: "#2d2c2a",
        },
      },
    },
  },
  plugins: [],
};
