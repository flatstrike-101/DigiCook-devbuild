import { ThemeProvider, useTheme } from "../ThemeProvider";
import { Button } from "@/components/ui/button";

function ThemeToggleExample() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="p-6 space-y-4">
      <p>Current theme: {theme}</p>
      <Button onClick={toggleTheme}>
        Toggle to {theme === "light" ? "dark" : "light"} mode
      </Button>
    </div>
  );
}

export default function ThemeProviderExample() {
  return (
    <ThemeProvider>
      <ThemeToggleExample />
    </ThemeProvider>
  );
}
