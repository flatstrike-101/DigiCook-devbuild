import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "navy" | "red";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("digiCook_theme");
    return stored === "light" ||
      stored === "dark" ||
      stored === "navy" ||
      stored === "red"
      ? stored
      : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "theme-navy", "theme-red");

    if (theme === "dark") root.classList.add("dark");
    if (theme === "navy") root.classList.add("theme-navy");
    if (theme === "red") root.classList.add("theme-red");

    localStorage.setItem("digiCook_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
