import { Recipe } from "@shared/schema";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipe/${recipe.id}`} data-testid={`link-recipe-${recipe.id}`}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer transition-all h-full flex flex-col">
        <div className="p-4 flex-1 flex flex-col gap-3">
          {recipe.isPersonal && (
            <Badge className="w-fit">
              Personal
            </Badge>
          )}
          <div>
            <h3 className="font-serif text-xl font-semibold line-clamp-1" data-testid={`text-recipe-title-${recipe.id}`}>
              {recipe.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {recipe.description}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
            <div className="flex items-center gap-1" data-testid={`text-cook-time-${recipe.id}`}>
              <Clock className="h-4 w-4" />
              <span>{recipe.cookTime} min</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
