
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // For next-themes
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "", // No prefix for Shadcn UI
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))", // #D0D7DE -> 210 14% 84.1%
        input: "hsl(var(--input))", // #D0D7DE -> 210 14% 84.1% (same as border for GitHub style)
        ring: "hsl(var(--ring))", // #0969DA -> 215 97.4% 44.9% (focus ring, primary blue)
        background: "hsl(var(--background))", // #FFFFFF -> 0 0% 100%
        foreground: "hsl(var(--foreground))", // #24292F -> 215 14% 16%
        primary: {
          DEFAULT: "hsl(var(--primary))", // #0969DA -> 215 97.4% 44.9%
          foreground: "hsl(var(--primary-foreground))", // #F6F8FA -> 210 16.7% 97.3%
        },
        secondary: { // Using GitHub's gray button style as secondary
          DEFAULT: "hsl(var(--muted))", // #F6F8FA
          foreground: "hsl(var(--foreground))", // Text color on gray buttons is usually dark
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))", // #CF222E -> 356 71.4% 47.3% (prompt: 356 71.4% 59%)
          foreground: "hsl(var(--destructive-foreground))", // #F6F8FA
        },
        success: { // Added for success states like green buttons
          DEFAULT: "hsl(var(--success))", // #2DA44E -> 148 62.1% 40.8%
          foreground: "hsl(var(--success-foreground))", // #F6F8FA
        },
        muted: {
          DEFAULT: "hsl(var(--muted))", // #F6F8FA -> 210 16.7% 97.3%
          foreground: "hsl(var(--muted-foreground))", // #636C76 -> 214 7% 43.4%
        },
        accent: { // For hover/active states on muted elements
          DEFAULT: "hsl(var(--accent))", // #F6F8FA (often a slightly darker shade or primary interaction for hover)
                                        // For GitHub, hover on gray buttons often darkens them slightly, or uses border.
                                        // Using #F0F2F4 (a slightly darker gray) could be an option, or rely on border/opacity.
                                        // For now, sticking to prompt's accent mapping.
          foreground: "hsl(var(--accent-foreground))", // #24292F
        },
        popover: {
          DEFAULT: "hsl(var(--popover))", // #FFFFFF
          foreground: "hsl(var(--popover-foreground))", // #24292F
        },
        card: {
          DEFAULT: "hsl(var(--card))", // #FFFFFF
          foreground: "hsl(var(--card-foreground))", // #24292F
        },
      },
      borderRadius: {
        lg: "var(--radius)", // default 0.5rem
        md: "calc(var(--radius) - 2px)", // default 0.375rem
        sm: "calc(var(--radius) - 4px)", // default 0.25rem
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"], // Inter for body
        // headings can use font-semibold or font-bold with Inter
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        // GitHub-like shadows
        'sm': '0 1px 0 rgba(27, 31, 36, 0.04)', // Subtle shadow for less prominent elements
        'md': '0 3px 6px rgba(140,149,159,.15)', // Common card shadow
        'lg': '0 8px 24px rgba(140,149,159,.2)', // For modals or larger popovers
        'header': '0 1px 0 rgba(27, 31, 36, 0.04)', // Shadow for header bottom border effect if needed
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
