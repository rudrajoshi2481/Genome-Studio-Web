import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui"],
        serif: ["var(--font-poppins)", "system-ui"],
        heading: ["var(--font-poppins)", "system-ui"],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
