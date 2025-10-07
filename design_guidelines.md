# DigiCook Design Guidelines

## Design Approach: Reference-Based (Food & Recipe Apps)
**Primary References:** Tasty, AllRecipes, Yummly  
**Rationale:** Recipe applications thrive on visual appeal, clear content hierarchy, and appetizing presentation. Drawing from established food platforms ensures familiar, trust-building patterns while maintaining creative freedom for food photography and ingredient displays.

## Core Design Principles
- **Appetizing Visual Language:** Warm, inviting colors that enhance food photography
- **Scannable Content:** Clear hierarchy for quick recipe discovery and step-by-step cooking
- **Accessibility First:** High contrast ratios, readable text over images, consistent dark mode
- **Beginner-Friendly:** Simple, predictable layouts that don't overwhelm new users

---

## Color Palette

### Light Mode
- **Primary Brand:** 25 75% 50% (vibrant orange-red, appetizing and energetic)
- **Secondary:** 145 60% 45% (fresh green for health/nutrition indicators)
- **Background:** 0 0% 98% (warm off-white)
- **Surface:** 0 0% 100% (pure white for recipe cards)
- **Text Primary:** 0 0% 15% (near-black for readability)
- **Text Secondary:** 0 0% 45% (medium gray for metadata)

### Dark Mode
- **Primary Brand:** 25 70% 55% (slightly lighter for contrast)
- **Secondary:** 145 50% 50%
- **Background:** 0 0% 10% (deep charcoal)
- **Surface:** 0 0% 14% (elevated dark cards)
- **Text Primary:** 0 0% 95%
- **Text Secondary:** 0 0% 65%

### Accent Colors (Use Sparingly)
- **Nutrition/Health:** 145 60% 45% (green)
- **Time/Duration:** 35 80% 50% (amber for cooking times)
- **Success States:** 145 60% 50%

---

## Typography

### Font Families
- **Display/Headers:** 'Playfair Display' or 'Merriweather' (serif, elegant for recipe titles)
- **Body/UI:** 'Inter' or 'Open Sans' (clean sans-serif for readability)

### Type Scale
- **Hero/Recipe Title:** text-4xl md:text-5xl lg:text-6xl font-bold
- **Section Headers:** text-2xl md:text-3xl font-semibold
- **Card Titles:** text-xl font-semibold
- **Body Text:** text-base leading-relaxed
- **Metadata/Labels:** text-sm font-medium text-secondary
- **Captions:** text-xs

---

## Layout System

### Spacing Primitives
**Core Units:** 2, 4, 6, 8, 12, 16 (Tailwind units)  
- **Tight spacing:** p-2, gap-2 (tags, small elements)
- **Standard spacing:** p-4, gap-4 (card padding, form fields)
- **Section padding:** py-8 md:py-12 lg:py-16
- **Generous spacing:** p-8, gap-8 (feature sections)

### Grid System
- **Recipe Cards:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- **Ingredient Lists:** Single column, max-w-2xl
- **Dashboard:** 2-column layout (sidebar + main content) on lg+

### Container Widths
- **Full-width sections:** w-full with inner max-w-7xl mx-auto px-4
- **Content sections:** max-w-6xl mx-auto
- **Reading content:** max-w-4xl (recipe details)

---

## Component Library

### Navigation
- **Header:** Sticky top bar with logo, search, user menu
- **Mobile:** Hamburger menu with slide-out drawer
- **Search Bar:** Prominent, always accessible

### Recipe Cards
- **Image:** Aspect ratio 4:3, object-cover, rounded-lg
- **Overlay Gradient:** For text readability on images
- **Quick Info:** Icons + text (time, difficulty, servings)
- **Hover State:** Subtle scale transform (scale-105) with shadow increase

### Recipe Detail Page
- **Hero Section:** Large food image (60vh) with recipe title overlay
- **Ingredients List:** Checkbox items, quantities clearly displayed
- **Steps:** Numbered, sequential cards with generous spacing
- **Nutrition Panel:** Card with grid layout (2-3 columns on desktop)

### Forms (Add Recipe / Login)
- **Input Fields:** Rounded borders, focus ring in primary color
- **Labels:** text-sm font-medium mb-2
- **Validation:** Inline error messages in red-500
- **Submit Buttons:** Full-width on mobile, auto on desktop

### Authentication Pages
- **Layout:** Centered card (max-w-md) with soft shadow
- **Logo:** Prominent at top
- **Social Login:** Icon buttons with hover states (if applicable)

### Personal Recipe Management
- **My Recipes Tab:** Grid view similar to browse
- **Share Modal:** Clean dialog with shareable link generation UI
- **Edit/Delete:** Contextual actions on hover

---

## Images

### Image Strategy
- **Hero Image:** YES - Large hero on homepage (70vh) featuring appetizing food photography with DigiCook logo overlay
- **Recipe Cards:** Each recipe requires high-quality food photo (use placeholder service or free stock photos from Unsplash/Pexels)
- **Detail Pages:** Full-width hero image of the dish
- **Empty States:** Friendly illustrations for "no recipes" scenarios

### Image Sources for Starter Recipes
Use free stock photography APIs or services:
- Unsplash API for food photography
- Pexels for recipe images
- Placeholder: `https://source.unsplash.com/800x600/?food,[recipe-name]`

---

## Page-Specific Layouts

### Homepage/Browse Recipes
- Hero section (70vh) with search overlay
- Filter bar (cuisine, dietary, time)
- Recipe grid (responsive columns)
- Load more / pagination

### Recipe Detail
- Hero image with title, rating, time overlay
- 2-column layout (ingredients left, steps right) on lg+
- Nutrition facts card at bottom
- Related recipes section

### My Recipes / Dashboard
- Top bar with "Add Recipe" CTA
- Grid of personal recipes
- Empty state with illustration + "Create your first recipe" CTA

### Add/Edit Recipe Form
- Multi-step or sectioned form
- Image upload placeholder (non-functional but UI present)
- Dynamic ingredient/step addition
- Nutrition calculator UI (mock)

---

## Interaction & Animation
**Minimal Approach - Use Sparingly:**
- Card hover: subtle scale + shadow (transition-transform duration-200)
- Button interactions: default Tailwind focus/hover states
- Page transitions: simple fade-in for content (avoid complex animations)
- Form validation: instant inline feedback

---

## Accessibility & Dark Mode
- Maintain WCAG AA contrast ratios (4.5:1 minimum)
- All form inputs fully visible in dark mode
- Focus indicators on all interactive elements
- Alt text for all recipe images
- Semantic HTML with proper heading hierarchy