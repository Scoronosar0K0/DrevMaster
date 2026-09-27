/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Нейтральная шкала интерфейса (фон, текст, границы)
        ink: {
          50: "#f6f7f9",
          100: "#eef0f3",
          200: "#dfe3e8",
          300: "#c5ccd6",
          400: "#8d97a8",
          500: "#667085",
          600: "#475467",
          700: "#344054",
          800: "#1d2939",
          900: "#101828",
          950: "#0b1220",
        },
        // Основной акцент: кнопки, ссылки, активные элементы
        brand: {
          50: "#eff5ff",
          100: "#dbe8fe",
          200: "#bfd5fe",
          500: "#3b7cf6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};
