import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  MealItem,
  MealPlan,
  PantryItem,
  ShoppingListItem,
  FamilyMealPreferences,
  AssistantApp,
  DayOfWeek,
  MealType,
} from '../types';

export const MEAL_PLANNER_APP_ID = 'meal_planner';

export const DEFAULT_MEAL_PLANNER_METADATA: AssistantApp = {
  id: MEAL_PLANNER_APP_ID,
  appName: 'Meal Planner',
  name: 'Meal Planner',
  appDescription:
    'AI-powered family meal planning, weekly schedules, personalized recipe suggestions, pantry inventory & smart grocery list.',
  description:
    'AI-powered family meal planning, weekly schedules, personalized recipe suggestions, pantry inventory & smart grocery list.',
  status: 'active',
  icon: 'utensils',
  category: 'Lifestyle',
  route: '/meal_planner',
  dataPath: 'apps/meal_planner',
  aiModel: 'gemini-3.1-flash-lite',
  features: [
    'AI Meal Generator tailored to family dietary goals, budget & pantry items',
    '7-Day Weekly Meal Planning Calendar',
    'Pantry & Fridge Inventory Tracker',
    'Consolidated Interactive Grocery Shopping List',
    'Step-by-Step Recipes with Nutritional Information (Calories, Protein, Carbs, Fats)',
  ],
};

function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Ensures the app descriptor document exists at /apps/meal_planner.
 */
export async function ensureMealPlannerAppDocument(): Promise<void> {
  try {
    const appDocRef = doc(db, 'apps', MEAL_PLANNER_APP_ID);
    const existing = await getDoc(appDocRef);
    if (!existing.exists()) {
      await setDoc(appDocRef, {
        ...DEFAULT_MEAL_PLANNER_METADATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(appDocRef, {
        appName: 'Meal Planner',
        name: 'Meal Planner',
        status: 'active',
        dataPath: 'apps/meal_planner',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('ensureMealPlannerAppDocument notice:', err?.message || err);
  }
}

// -------------------------------------------------------------
// MEALS / RECIPES
// -------------------------------------------------------------

export function subscribeToMeals(
  workspaceId: string,
  onData: (meals: MealItem[]) => void,
  onError?: (error: any) => void
) {
  const mealsCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'meals');
  const q = query(mealsCol, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MealItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort newest first
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function saveMeal(meal: MealItem): Promise<void> {
  const mealRef = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'meals', meal.id);
  const payload = cleanFirestoreObject({
    ...meal,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(mealRef, payload, { merge: true });
}

export async function deleteMeal(mealId: string): Promise<void> {
  const mealRef = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'meals', mealId);
  await deleteDoc(mealRef);
}

// -------------------------------------------------------------
// MEAL PLANS (WEEKLY)
// -------------------------------------------------------------

export function subscribeToMealPlans(
  workspaceId: string,
  onData: (plans: MealPlan[]) => void,
  onError?: (error: any) => void
) {
  const plansCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'plans');
  const q = query(plansCol, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MealPlan[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => (b.weekStartDate || '').localeCompare(a.weekStartDate || ''));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function saveMealPlan(plan: MealPlan): Promise<void> {
  const planRef = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'plans', plan.id);
  const payload = cleanFirestoreObject({
    ...plan,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(planRef, payload, { merge: true });
}

// -------------------------------------------------------------
// PANTRY & INGREDIENTS INVENTORY
// -------------------------------------------------------------

export function subscribeToPantry(
  workspaceId: string,
  onData: (items: PantryItem[]) => void,
  onError?: (error: any) => void
) {
  const pantryCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'pantry');
  const q = query(pantryCol, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PantryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function savePantryItem(item: PantryItem): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'pantry', item.id);
  const payload = cleanFirestoreObject({
    ...item,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(ref, payload, { merge: true });
}

export async function deletePantryItem(itemId: string): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'pantry', itemId);
  await deleteDoc(ref);
}

export async function togglePantryItemStock(itemId: string, inStock: boolean): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'pantry', itemId);
  await updateDoc(ref, { inStock, updatedAt: new Date().toISOString() });
}

// -------------------------------------------------------------
// SHOPPING LIST
// -------------------------------------------------------------

export function subscribeToShoppingList(
  workspaceId: string,
  onData: (items: ShoppingListItem[]) => void,
  onError?: (error: any) => void
) {
  const shoppingCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'shopping_list');
  const q = query(shoppingCol, where('workspaceId', '==', workspaceId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ShoppingListItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort unchecked first, then by category
      items.sort((a, b) => {
        if (a.checked === b.checked) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.checked ? 1 : -1;
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function saveShoppingItem(item: ShoppingListItem): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'shopping_list', item.id);
  const payload = cleanFirestoreObject({
    ...item,
  });
  await setDoc(ref, payload, { merge: true });
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'shopping_list', itemId);
  await deleteDoc(ref);
}

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'shopping_list', itemId);
  await updateDoc(ref, { checked });
}

export async function clearCheckedShoppingItems(workspaceId: string, items?: ShoppingListItem[]): Promise<void> {
  if (items && items.length > 0) {
    const checked = items.filter((i) => i.checked && i.workspaceId === workspaceId);
    for (const item of checked) {
      await deleteShoppingItem(item.id);
    }
    return;
  }
  const shoppingCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'shopping_list');
  const q = query(shoppingCol, where('workspaceId', '==', workspaceId), where('checked', '==', true));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

// -------------------------------------------------------------
// FAMILY MEAL PREFERENCES
// -------------------------------------------------------------

export const DEFAULT_FAMILY_PREFERENCES: FamilyMealPreferences = {
  id: 'preferences_default',
  householdMembersCount: 4,
  dietaryGoals: ['balanced', 'high_protein', 'budget_friendly'],
  allergiesAndDislikes: [],
  favoriteIngredients: ['Garlic', 'Chicken', 'Olive oil', 'Avocado', 'Sweet potatoes', 'Basmati rice'],
  maxPrepTimeMinutes: 35,
  weeklyFoodBudgetZAR: 1600,
  cuisinePreferences: ['South African', 'Mediterranean', 'Healthy Family Homestyle'],
  workspaceId: '',
  updatedAt: new Date().toISOString(),
};

export function subscribeToFamilyMealPreferences(
  workspaceId: string,
  onData: (prefs: FamilyMealPreferences) => void,
  onError?: (error: any) => void
) {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'preferences', workspaceId);

  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData({ id: snap.id, ...(snap.data() as any) });
      } else {
        onData({ ...DEFAULT_FAMILY_PREFERENCES, id: workspaceId, workspaceId });
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function saveFamilyMealPreferences(
  prefs: FamilyMealPreferences
): Promise<void> {
  const ref = doc(db, 'apps', MEAL_PLANNER_APP_ID, 'preferences', prefs.workspaceId);
  const payload = cleanFirestoreObject({
    ...prefs,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(ref, payload, { merge: true });
}

// -------------------------------------------------------------
// SEED STARTER DATA IF EMPTY
// -------------------------------------------------------------

export async function seedStarterMealPlannerIfEmpty(
  workspaceId: string,
  authorId: string = 'family_member',
  authorName: string = 'Family Member'
): Promise<void> {
  try {
    await ensureMealPlannerAppDocument();

    const mealsCol = collection(db, 'apps', MEAL_PLANNER_APP_ID, 'meals');
    const qMeals = query(mealsCol, where('workspaceId', '==', workspaceId));
    const snapMeals = await getDocs(qMeals);

    if (snapMeals.empty) {
      const now = new Date().toISOString();

      // 1. Starter Meals
      const starterMeals: MealItem[] = [
        {
          id: `meal_bobotie_${Date.now()}`,
          title: 'Cape Malay Bobotie with Yellow Rice',
          description:
            'A legendary South African spiced minced beef bake topped with golden egg custard and served with aromatic turmeric yellow raisin rice.',
          type: 'dinner',
          cuisine: 'South African',
          prepTimeMinutes: 20,
          cookTimeMinutes: 35,
          servings: 4,
          estimatedCostZAR: 135,
          imageOrEmoji: '🥘',
          isFavorite: true,
          source: 'family_recipe',
          tags: ['South African', 'Comfort Food', 'High Protein', 'Family Favorite'],
          nutrition: {
            calories: 540,
            protein: 38,
            carbs: 48,
            fats: 22,
          },
          ingredients: [
            { id: 'i1', name: 'Lean beef mince', amount: 600, unit: 'g', category: 'meat_protein', inPantry: true },
            { id: 'i2', name: 'Yellow onion, diced', amount: 1, unit: 'unit', category: 'produce', inPantry: true },
            { id: 'i3', name: 'Cape Malay curry powder', amount: 2, unit: 'tbsp', category: 'spices_sauces', inPantry: true },
            { id: 'i4', name: 'Large eggs', amount: 2, unit: 'units', category: 'dairy_eggs', inPantry: true },
            { id: 'i5', name: 'Milk', amount: 250, unit: 'ml', category: 'dairy_eggs', inPantry: true },
            { id: 'i6', name: 'Bay leaves', amount: 4, unit: 'units', category: 'spices_sauces', inPantry: false },
            { id: 'i7', name: 'Basmati rice', amount: 300, unit: 'g', category: 'grains_pantry', inPantry: true },
            { id: 'i8', name: 'Ground turmeric', amount: 1, unit: 'tsp', category: 'spices_sauces', inPantry: true },
          ],
          instructions: [
            'Sauté diced onion and curry powder in olive oil until translucent and fragrant.',
            'Add ground beef mince and brown thoroughly, seasoning with salt and pepper.',
            'Transfer cooked meat mixture into a baking dish and smooth evenly.',
            'Whisk eggs and milk together with a pinch of salt; gently pour over meat.',
            'Press bay leaves onto the custard surface and bake at 180°C for 30 minutes until golden and set.',
            'Boil Basmati rice with a teaspoon of turmeric and raisins for bright yellow savory rice.',
          ],
          workspaceId,
          authorId,
          authorName,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `meal_hake_${Date.now() + 1}`,
          title: 'Pan-Seared Hake with Lemon Garlic Butter',
          description:
            'Tender Atlantic hake fillets seared golden with crisp edges, drizzled with zesty garlic butter and served with steamed green beans and sweet potato mash.',
          type: 'dinner',
          cuisine: 'Mediterranean',
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          servings: 4,
          estimatedCostZAR: 110,
          imageOrEmoji: '🐟',
          isFavorite: true,
          source: 'ai_suggested',
          whySuggested: 'High protein, low carb, quick 25-minute prep that aligns with healthy weekday goals.',
          tags: ['Quick Prep', 'High Protein', 'Seafood', 'Low Carb'],
          nutrition: {
            calories: 390,
            protein: 34,
            carbs: 24,
            fats: 16,
          },
          ingredients: [
            { id: 'i10', name: 'Hake fillets (fresh or defrosted)', amount: 600, unit: 'g', category: 'meat_protein', inPantry: false },
            { id: 'i11', name: 'Butter', amount: 3, unit: 'tbsp', category: 'dairy_eggs', inPantry: true },
            { id: 'i12', name: 'Fresh garlic, minced', amount: 3, unit: 'cloves', category: 'produce', inPantry: true },
            { id: 'i13', name: 'Lemon juice & zest', amount: 1, unit: 'lemon', category: 'produce', inPantry: false },
            { id: 'i14', name: 'Fresh green beans', amount: 300, unit: 'g', category: 'produce', inPantry: false },
            { id: 'i15', name: 'Sweet potatoes', amount: 2, unit: 'units', category: 'produce', inPantry: true },
          ],
          instructions: [
            'Pat hake fillets thoroughly dry with paper towel; season with sea salt, black pepper, and paprika.',
            'Melt 1 tbsp butter with 1 tsp olive oil in a large skillet over medium-high heat.',
            'Sear fillets for 3-4 minutes per side without disturbing until flaky and golden.',
            'Add minced garlic and remaining butter to the pan; baste fish with foaming garlic butter and fresh lemon juice.',
            'Steam green beans for 4 minutes and serve immediately alongside warm sweet potato mash.',
          ],
          workspaceId,
          authorId,
          authorName,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `meal_chicken_stew_${Date.now() + 2}`,
          title: 'Hearty Farmhouse Chicken & Root Veggie Stew',
          description:
            'Slow-simmered chicken breast fillets with baby potatoes, carrots, celery, and fresh rosemary in a savory rich chicken herb broth.',
          type: 'dinner',
          cuisine: 'South African',
          prepTimeMinutes: 15,
          cookTimeMinutes: 40,
          servings: 5,
          estimatedCostZAR: 120,
          imageOrEmoji: '🍲',
          isFavorite: false,
          source: 'family_recipe',
          tags: ['Stews', 'Wholesome', 'Budget Friendly', 'Batch Cook'],
          nutrition: {
            calories: 460,
            protein: 42,
            carbs: 36,
            fats: 14,
          },
          ingredients: [
            { id: 'i20', name: 'Skinless chicken breasts, diced', amount: 700, unit: 'g', category: 'meat_protein', inPantry: true },
            { id: 'i21', name: 'Baby potatoes, halved', amount: 500, unit: 'g', category: 'produce', inPantry: true },
            { id: 'i22', name: 'Carrots, sliced into coins', amount: 3, unit: 'units', category: 'produce', inPantry: false },
            { id: 'i23', name: 'Chicken stock broth', amount: 600, unit: 'ml', category: 'grains_pantry', inPantry: true },
            { id: 'i24', name: 'Fresh rosemary & thyme', amount: 2, unit: 'sprigs', category: 'produce', inPantry: false },
          ],
          instructions: [
            'Sear chicken chunks in olive oil until golden brown on exterior; remove to plate.',
            'Add diced onions, carrots, and celery to pan and cook until slightly caramelized.',
            'Return chicken, add halved baby potatoes, chicken stock, and fresh herbs.',
            'Simmer gently covered for 30 minutes until potatoes are fork-tender and sauce thickens naturally.',
          ],
          workspaceId,
          authorId,
          authorName,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `meal_protein_bowl_${Date.now() + 3}`,
          title: 'Power Scramble Avocado Breakfast Bowl',
          description:
            'Free-range eggs scrambled with baby spinach, cherry tomatoes, creamy avocado slices, and toasted sourdough bread.',
          type: 'breakfast',
          cuisine: 'Modern Family',
          prepTimeMinutes: 5,
          cookTimeMinutes: 8,
          servings: 2,
          estimatedCostZAR: 45,
          imageOrEmoji: '🍳',
          isFavorite: true,
          source: 'ai_suggested',
          whySuggested: 'Fast morning breakfast packed with healthy fats, clean protein, and micro-nutrients.',
          tags: ['Breakfast', 'High Protein', 'Vegetarian', 'Fast 15-min'],
          nutrition: {
            calories: 420,
            protein: 26,
            carbs: 28,
            fats: 22,
          },
          ingredients: [
            { id: 'i30', name: 'Free-range eggs', amount: 4, unit: 'units', category: 'dairy_eggs', inPantry: true },
            { id: 'i31', name: 'Ripe avocado', amount: 1, unit: 'unit', category: 'produce', inPantry: false },
            { id: 'i32', name: 'Baby spinach', amount: 100, unit: 'g', category: 'produce', inPantry: false },
            { id: 'i33', name: 'Cherry tomatoes', amount: 100, unit: 'g', category: 'produce', inPantry: false },
            { id: 'i34', name: 'Artisanal sourdough slices', amount: 2, unit: 'slices', category: 'grains_pantry', inPantry: true },
          ],
          instructions: [
            'Whisk eggs with a splash of milk, sea salt, and cracked black pepper.',
            'Melt a knob of butter over low heat; gently scramble eggs folding softly until creamy.',
            'Wilt baby spinach in the warm pan for 1 minute.',
            'Serve with sliced ripe avocado and warm toasted sourdough.',
          ],
          workspaceId,
          authorId,
          authorName,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `meal_med_salad_${Date.now() + 4}`,
          title: 'Crispy Chickpea & Feta Mediterranean Lunch Bowl',
          description:
            'Roasted spiced chickpeas, crisp cucumber, kalamata olives, crumbled feta, and fresh parsley tossed in lemon oregano vinaigrette.',
          type: 'lunch',
          cuisine: 'Mediterranean',
          prepTimeMinutes: 10,
          cookTimeMinutes: 10,
          servings: 3,
          estimatedCostZAR: 55,
          imageOrEmoji: '🥗',
          isFavorite: false,
          source: 'ai_suggested',
          whySuggested: 'Great for meal-prep lunches, high in dietary fiber and plant protein.',
          tags: ['Lunch', 'Vegetarian', 'Meal Prep', 'Mediterranean'],
          nutrition: {
            calories: 360,
            protein: 15,
            carbs: 42,
            fats: 16,
          },
          ingredients: [
            { id: 'i40', name: 'Canned chickpeas, rinsed & drained', amount: 400, unit: 'g', category: 'grains_pantry', inPantry: true },
            { id: 'i41', name: 'English cucumber, diced', amount: 1, unit: 'unit', category: 'produce', inPantry: false },
            { id: 'i42', name: 'Danish or Greek feta cheese', amount: 100, unit: 'g', category: 'dairy_eggs', inPantry: false },
            { id: 'i43', name: 'Kalamata olives, pitted', amount: 50, unit: 'g', category: 'grains_pantry', inPantry: true },
            { id: 'i44', name: 'Extra virgin olive oil', amount: 2, unit: 'tbsp', category: 'spices_sauces', inPantry: true },
          ],
          instructions: [
            'Pat chickpeas dry and toss in olive oil, cumin, and paprika; toast in skillet until crispy.',
            'In a large bowl, combine diced cucumber, halved cherry tomatoes, and kalamata olives.',
            'Whisk olive oil, fresh lemon juice, dried oregano, salt and pepper.',
            'Toss vegetables with dressing, top with warm crispy chickpeas and crumbled feta.',
          ],
          workspaceId,
          authorId,
          authorName,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const m of starterMeals) {
        await saveMeal(m);
      }

      // 2. Starter Pantry Items
      const starterPantry: PantryItem[] = [
        { id: 'p1', name: 'Lean beef mince', category: 'meat_protein', quantity: 600, unit: 'g', inStock: true, workspaceId, updatedAt: now },
        { id: 'p2', name: 'Skinless chicken breasts', category: 'meat_protein', quantity: 1, unit: 'kg', inStock: true, workspaceId, updatedAt: now },
        { id: 'p3', name: 'Free-range eggs', category: 'dairy_eggs', quantity: 12, unit: 'units', inStock: true, workspaceId, updatedAt: now },
        { id: 'p4', name: 'Fresh Full Cream Milk', category: 'dairy_eggs', quantity: 2, unit: 'L', inStock: true, workspaceId, updatedAt: now },
        { id: 'p5', name: 'Butter (Salted)', category: 'dairy_eggs', quantity: 500, unit: 'g', inStock: true, workspaceId, updatedAt: now },
        { id: 'p6', name: 'Basmati Rice', category: 'grains_pantry', quantity: 2, unit: 'kg', inStock: true, workspaceId, updatedAt: now },
        { id: 'p7', name: 'Baby potatoes', category: 'produce', quantity: 1, unit: 'kg', inStock: true, workspaceId, updatedAt: now },
        { id: 'p8', name: 'Yellow Onions', category: 'produce', quantity: 6, unit: 'units', inStock: true, workspaceId, updatedAt: now },
        { id: 'p9', name: 'Fresh Garlic bulbs', category: 'produce', quantity: 3, unit: 'heads', inStock: true, workspaceId, updatedAt: now },
        { id: 'p10', name: 'Sweet potatoes', category: 'produce', quantity: 4, unit: 'units', inStock: true, workspaceId, updatedAt: now },
        { id: 'p11', name: 'Extra virgin olive oil', category: 'spices_sauces', quantity: 750, unit: 'ml', inStock: true, workspaceId, updatedAt: now },
        { id: 'p12', name: 'Cape Malay curry powder', category: 'spices_sauces', quantity: 100, unit: 'g', inStock: true, workspaceId, updatedAt: now },
        { id: 'p13', name: 'Rolled Oats', category: 'grains_pantry', quantity: 1, unit: 'kg', inStock: true, workspaceId, updatedAt: now },
        { id: 'p14', name: 'Canned chickpeas', category: 'grains_pantry', quantity: 3, unit: 'cans', inStock: true, workspaceId, updatedAt: now },
      ];

      for (const p of starterPantry) {
        await savePantryItem(p);
      }

      // 3. Starter Shopping List
      const starterShopping: ShoppingListItem[] = [
        { id: 's1', name: 'Fresh Hake fillets', category: 'Fish & Seafood', quantity: '600g', unit: 'g', checked: false, estimatedPriceZAR: 85, sourceMealTitle: 'Pan-Seared Hake', workspaceId, createdAt: now },
        { id: 's2', name: 'Fresh green beans', category: 'Fresh Produce', quantity: '300g', unit: 'g', checked: false, estimatedPriceZAR: 24, sourceMealTitle: 'Pan-Seared Hake', workspaceId, createdAt: now },
        { id: 's3', name: 'Lemons', category: 'Fresh Produce', quantity: '4 units', unit: 'units', checked: false, estimatedPriceZAR: 18, sourceMealTitle: 'Pan-Seared Hake', workspaceId, createdAt: now },
        { id: 's4', name: 'Baby spinach bag', category: 'Fresh Produce', quantity: '200g', unit: 'g', checked: false, estimatedPriceZAR: 26, sourceMealTitle: 'Power Scramble', workspaceId, createdAt: now },
        { id: 's5', name: 'Ripe avocados', category: 'Fresh Produce', quantity: '2 units', unit: 'units', checked: false, estimatedPriceZAR: 32, sourceMealTitle: 'Power Scramble', workspaceId, createdAt: now },
        { id: 's6', name: 'Danish Feta cheese', category: 'Dairy & Cheese', quantity: '200g', unit: 'g', checked: false, estimatedPriceZAR: 38, sourceMealTitle: 'Mediterranean Salad', workspaceId, createdAt: now },
      ];

      for (const s of starterShopping) {
        await saveShoppingItem(s);
      }

      // 4. Starter Weekly Meal Plan
      const getMonday = (d: Date) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
      };

      const weekMonday = getMonday(new Date());

      const samplePlan: MealPlan = {
        id: `plan_${weekMonday}`,
        weekStartDate: weekMonday,
        title: `Family Meal Plan — Week of ${weekMonday}`,
        slots: [
          { id: 'sl_1', dayOfWeek: 'monday', type: 'breakfast', mealTitle: 'Power Scramble Avocado Breakfast Bowl', mealId: starterMeals[3].id },
          { id: 'sl_2', dayOfWeek: 'monday', type: 'dinner', mealTitle: 'Pan-Seared Hake with Lemon Garlic Butter', mealId: starterMeals[1].id },
          { id: 'sl_3', dayOfWeek: 'tuesday', type: 'lunch', mealTitle: 'Crispy Chickpea & Feta Mediterranean Lunch Bowl', mealId: starterMeals[4].id },
          { id: 'sl_4', dayOfWeek: 'tuesday', type: 'dinner', mealTitle: 'Hearty Farmhouse Chicken & Root Veggie Stew', mealId: starterMeals[2].id },
          { id: 'sl_5', dayOfWeek: 'wednesday', type: 'dinner', mealTitle: 'Cape Malay Bobotie with Yellow Rice', mealId: starterMeals[0].id },
          { id: 'sl_6', dayOfWeek: 'thursday', type: 'dinner', mealTitle: 'Leftover Bobotie & Steamed Veggies', notes: 'Quick reheat night' },
          { id: 'sl_7', dayOfWeek: 'friday', type: 'dinner', mealTitle: 'Family Homemade Braai / Grilled Chicken', notes: 'Weekend celebration kickoff' },
          { id: 'sl_8', dayOfWeek: 'saturday', type: 'breakfast', mealTitle: 'Pancake & Fruit Family Brunch' },
          { id: 'sl_9', dayOfWeek: 'sunday', type: 'dinner', mealTitle: 'Sunday Roast Chicken & Roasted Potatoes' },
        ],
        workspaceId,
        createdAt: now,
        updatedAt: now,
      };

      await saveMealPlan(samplePlan);

      // 5. Starter Family Preferences
      await saveFamilyMealPreferences({
        ...DEFAULT_FAMILY_PREFERENCES,
        id: workspaceId,
        workspaceId,
      });
    }
  } catch (err: any) {
    console.warn('seedStarterMealPlannerIfEmpty notice:', err?.message || err);
  }
}
