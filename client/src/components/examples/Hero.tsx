import { Hero } from "../Hero";

export default function HeroExample() {
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  return <Hero onSearch={handleSearch} />;
}
