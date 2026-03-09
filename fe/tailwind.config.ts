import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', '"Outfit"', 'system-ui', 'sans-serif'],
        num: ['"Outfit"', '"Noto Sans KR"', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        category: {
          task: "hsl(var(--category-task))",
          "task-light": "hsl(var(--category-task-light))",
          "task-strong": "hsl(var(--category-task-strong))",
          appointment: "hsl(var(--category-appointment))",
          "appointment-light": "hsl(var(--category-appointment-light))",
          "appointment-strong": "hsl(var(--category-appointment-strong))",
          important: "hsl(var(--category-important))",
          "important-light": "hsl(var(--category-important-light))",
          "important-strong": "hsl(var(--category-important-strong))",
          group: "hsl(var(--category-group))",
          "group-light": "hsl(var(--category-group-light))",
          "group-strong": "hsl(var(--category-group-strong))",
          repeat: "hsl(var(--category-repeat))",
          "repeat-light": "hsl(var(--category-repeat-light))",
          "repeat-strong": "hsl(var(--category-repeat-strong))",
        },
        coord: {
          gray: "hsl(var(--coord-gray))",
          green: "hsl(var(--coord-green))",
          blue: "hsl(var(--coord-blue))",
          best: "hsl(var(--coord-best))",
          alt: "hsl(var(--coord-alt))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        'soft': '0 1px 3px 0 hsl(225 12% 13% / 0.04), 0 1px 2px -1px hsl(225 12% 13% / 0.04)',
        'card': '0 2px 8px -2px hsl(225 12% 13% / 0.06)',
        'elevated': '0 4px 16px -4px hsl(225 12% 13% / 0.08)',
        'fab': '0 6px 20px -4px hsl(225 12% 13% / 0.15)',
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
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.96)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
