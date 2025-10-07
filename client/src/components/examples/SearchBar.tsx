import { SearchBar } from "../SearchBar";

export default function SearchBarExample() {
  return (
    <SearchBar
      onSearch={(query) => console.log("Search:", query)}
      onDifficultyFilter={(difficulty) => console.log("Difficulty:", difficulty)}
      onDietaryFilter={(dietary) => console.log("Dietary:", dietary)}
    />
  );
}
