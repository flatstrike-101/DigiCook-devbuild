import { Header } from "../Header";
import { ThemeProvider } from "../ThemeProvider";
import { Router } from "wouter";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <Router>
        <Header />
      </Router>
    </ThemeProvider>
  );
}
