/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          ["border", "input", "ring", "background", "foreground"].map(
            (name) => [name, `hsl(var(--${name}) / <alpha-value>)`],
          ),
        ),
        ...Object.fromEntries(
          ["primary", "secondary", "destructive", "muted", "accent", "popover", "card"].map(
            (name) => [name, {
              DEFAULT: `hsl(var(--${name}) / <alpha-value>)`,
              foreground: `hsl(var(--${name}-foreground) / <alpha-value>)`,
            }],
          ),
        ),
        chart: Object.fromEntries(
          [1, 2, 3, 4, 5].map((number) => [number, `hsl(var(--chart-${number}) / <alpha-value>)`]),
        ),
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      fontFamily: {
        body: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
