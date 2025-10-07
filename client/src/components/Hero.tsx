import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/DigiCook_hero_banner_image_ba19acd9.png";

interface HeroProps {
  onSearch: (query: string) => void;
}

export function Hero({ onSearch }: HeroProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;
    onSearch(query);
  };

  return (
    <div className="relative h-[70vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
      
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
          Welcome to DigiCook
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8">
          Get ready to discover your next favorite dish!
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search for a recipe"
                className="pl-10 h-12 text-base bg-white/95 backdrop-blur border-white/20"
                data-testid="input-hero-search"
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="h-12"
              data-testid="button-hero-search"
            >
              Search
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
