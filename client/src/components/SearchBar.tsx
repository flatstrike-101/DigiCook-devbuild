import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onDifficultyFilter?: (difficulty: string) => void; // or the correct type
  onDietaryFilter?: (dietary: string) => void;       // or the correct type
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;
    onSearch(query);
  };

  /*return (
    <div className="bg-card border-y py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="search"
              placeholder="Search recipes..."
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <Button type="submit" data-testid="button-search">
            Search
          </Button>
        </form>
      </div>
    </div>
  );
  */
}
