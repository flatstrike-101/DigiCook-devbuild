import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUwQhIBpyvubYME6e0oydxPn_u5DwJUDg",
  authDomain: "digicook-2ecbe.firebaseapp.com",
  projectId: "digicook-2ecbe",
  storageBucket: "digicook-2ecbe.firebasestorage.app",
  messagingSenderId: "21145060975",
  appId: "1:21145060975:web:d4ada2a7adc5235c026f9a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const publicRecipes = [
  {
    id: "greek-salad",
    title: "Greek Salad",
    description: "Refreshing salad with tomatoes, cucumber, olives, and feta cheese.",
    imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85",
    ingredients: [
      { name: "Tomatoes", amount: "2" },
      { name: "Cucumber", amount: "1" },
      { name: "Feta cheese", amount: "150", unit: "g" },
      { name: "Olives", amount: "10" },
    ],
    steps: [
      "Chop vegetables.",
      "Mix all ingredients in a bowl.",
      "Add olive oil and oregano to taste.",
    ],
    cookTime: "10 min",
  },
  {
    id: "spaghetti-carbonara",
    title: "Spaghetti Carbonara",
    description: "Classic Italian pasta with eggs, cheese, pancetta, and black pepper.",
    imageUrl: "https://images.unsplash.com/photo-1589308078054-83211a1c1a23",
    ingredients: [
      { name: "Spaghetti", amount: "200", unit: "g" },
      { name: "Eggs", amount: "2" },
      { name: "Pancetta", amount: "100", unit: "g" },
      { name: "Parmesan cheese", amount: "50", unit: "g" },
    ],
    steps: [
      "Boil pasta in salted water.",
      "Cook pancetta until crispy.",
      "Mix eggs with grated cheese.",
      "Combine all together off heat and season with pepper.",
    ],
    cookTime: "25 min",
  },
  {
    id: "chicken-alfredo",
    title: "Chicken Alfredo Pasta",
    description: "Creamy fettuccine Alfredo with grilled chicken and parmesan.",
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1470",
    ingredients: [
      { name: "Fettuccine", amount: "250", unit: "g" },
      { name: "Chicken breast", amount: "1" },
      { name: "Heavy cream", amount: "1", unit: "cup" },
      { name: "Parmesan cheese", amount: "1/2", unit: "cup" },
    ],
    steps: [
      "Cook pasta until al dente.",
      "Grill chicken and slice.",
      "Simmer cream and cheese until thick.",
      "Combine pasta with sauce and chicken.",
    ],
    cookTime: "30 min",
  },
  {
    id: "caprese-sandwich",
    title: "Caprese Sandwich",
    description: "Mozzarella, tomatoes, and basil with balsamic glaze on ciabatta.",
    imageUrl: "https://images.unsplash.com/photo-1590080875832-01c2b86af08f",
    ingredients: [
      { name: "Ciabatta bread", amount: "1" },
      { name: "Tomatoes", amount: "2" },
      { name: "Mozzarella cheese", amount: "100", unit: "g" },
      { name: "Basil leaves", amount: "5" },
    ],
    steps: [
      "Slice bread and toast lightly.",
      "Layer mozzarella, tomato, and basil.",
      "Drizzle with olive oil and balsamic glaze.",
    ],
    cookTime: "10 min",
  },
  {
    id: "beef-tacos",
    title: "Beef Tacos",
    description: "Crispy tacos with seasoned ground beef, lettuce, and cheese.",
    imageUrl: "https://images.unsplash.com/photo-1617196035056-c5e052d3f36c",
    ingredients: [
      { name: "Ground beef", amount: "300", unit: "g" },
      { name: "Taco shells", amount: "6" },
      { name: "Cheddar cheese", amount: "100", unit: "g" },
      { name: "Lettuce", amount: "1/2", unit: "cup" },
    ],
    steps: [
      "Cook beef with taco seasoning.",
      "Fill taco shells with beef, lettuce, and cheese.",
      "Serve immediately.",
    ],
    cookTime: "20 min",
  },
  {
    id: "chicken-curry",
    title: "Chicken Curry",
    description: "A mild, flavorful curry made with coconut milk and tender chicken.",
    imageUrl: "https://images.unsplash.com/photo-1627308595187-9b6f68d1c7da",
    ingredients: [
      { name: "Chicken breast", amount: "2" },
      { name: "Coconut milk", amount: "400", unit: "ml" },
      { name: "Curry powder", amount: "2", unit: "tbsp" },
      { name: "Onion", amount: "1" },
    ],
    steps: [
      "Sauté onions until golden.",
      "Add chicken and brown lightly.",
      "Stir in curry powder and coconut milk.",
      "Simmer until sauce thickens.",
    ],
    cookTime: "40 min",
  },
  {
    id: "pancakes",
    title: "Fluffy Pancakes",
    description: "Soft, fluffy pancakes perfect for breakfast or brunch.",
    imageUrl: "https://images.unsplash.com/photo-1588765907995-47867ce30312?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1374",
    ingredients: [
      { name: "Flour", amount: "1.5", unit: "cups" },
      { name: "Milk", amount: "1.25", unit: "cups" },
      { name: "Egg", amount: "1" },
      { name: "Baking powder", amount: "3.5", unit: "tsp" },
    ],
    steps: [
      "Mix dry ingredients.",
      "Whisk in milk and egg until smooth.",
      "Cook batter on a lightly greased pan.",
    ],
    cookTime: "15 min",
  },
  {
    id: "bruschetta",
    title: "Tomato Bruschetta",
    description: "Toasted bread topped with garlic, diced tomatoes, and basil.",
    imageUrl: "https://images.unsplash.com/photo-1565958011702-44e2111c0f4b",
    ingredients: [
      { name: "Baguette", amount: "1/2" },
      { name: "Tomatoes", amount: "2" },
      { name: "Garlic", amount: "2", unit: "cloves" },
      { name: "Basil leaves", amount: "5" },
    ],
    steps: [
      "Toast bread slices.",
      "Rub garlic on top and spoon tomato mixture over them.",
    ],
    cookTime: "10 min",
  },
  {
    id: "caesar-salad",
    title: "Caesar Salad",
    description: "Crisp romaine lettuce with creamy dressing and crunchy croutons.",
    imageUrl: "https://images.unsplash.com/photo-1606787366850-de6330128bfc",
    ingredients: [
      { name: "Romaine lettuce", amount: "1", unit: "head" },
      { name: "Croutons", amount: "1", unit: "cup" },
      { name: "Parmesan cheese", amount: "1/4", unit: "cup" },
      { name: "Caesar dressing", amount: "3", unit: "tbsp" },
    ],
    steps: [
      "Toss all ingredients together in a large bowl.",
      "Mix ingredients in the bowl until well coated with dressing.",
      "Serve or store in fridge."
    ],
    cookTime: "5 min",
  },
  {
    id: "french-toast",
    title: "French Toast",
    description: "Classic breakfast of bread soaked in egg and milk, then fried.",
    imageUrl: "https://images.unsplash.com/photo-1588167106111-1bf62a3d5d15",
    ingredients: [
      { name: "Bread slices", amount: "4" },
      { name: "Eggs", amount: "2" },
      { name: "Milk", amount: "1/2", unit: "cup" },
      { name: "Cinnamon", amount: "1/2", unit: "tsp" },
    ],
    steps: [
      "Whisk eggs, milk, and cinnamon.",
      "Dip bread in mixture and fry on both sides until golden.",
    ],
    cookTime: "15 min",
  },
];

async function seed() {
  const colRef = collection(db, "publicRecipes");

  for (const recipe of publicRecipes) {
    const data = {
      ...recipe,
      imageUrl:
        recipe.imageUrl ||
        "https://via.placeholder.com/600x400?text=No+Image+Available",
    };
    await setDoc(doc(colRef, recipe.id), data, { merge: true });
    console.log(`✅ Synced (created or updated): ${recipe.title}`);
  }

  console.log("All recipes synced or added successfully!");
}

seed().catch(console.error);
