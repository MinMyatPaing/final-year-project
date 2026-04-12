/** @type {import('tailwindcss').Config} */
module.exports = {
  // Only include App, components, screens, and app folders for Tailwind scanning
  content: [
    "./App.js",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}