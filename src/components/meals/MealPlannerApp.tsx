import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Calendar,
  BookOpen,
  Package,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Plus,
  ArrowLeft,
  Search,
  Heart,
  ChefHat,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  MealItem,
  MealPlan,
  PantryItem,
  ShoppingListItem,
  FamilyMealPreferences,
  MealType,
  UserProfile,
} from '../../types';
import {
  subscribeToMeals,
  subscribeToMealPlans,
  subscribeToPantry,
  subscribeToShoppingList,
  subscribeToFamilyMealPreferences,
  saveMeal,
  deleteMeal,
  saveMealPlan,
  savePantryItem,
  deletePantryItem,
  saveShoppingItem,
  deleteShoppingItem,
  clearCheckedShoppingItems,
  saveFamilyMealPreferences,
  seedStarterMealPlannerIfEmpty,
} from '../../services/mealPlannerFirestoreService';

import { RecipeCard } from './RecipeCard';
import { MealDetailModal } from './MealDetailModal';
import { AIMealGeneratorModal } from './AIMealGeneratorModal';
import { WeeklyMealCalendar } from './WeeklyMealCalendar';
import { PantryManager } from './PantryManager';
import { SmartShoppingList } from './SmartShoppingList';
import { FamilyPreferencesModal } from './FamilyPreferencesModal';
import { MealEditModal } from './MealEditModal';

interface MealPlannerAppProps {
  userProfile?: UserProfile | null;
  onBackToHub?: () => void;
  onOpenProfile?: () => void;
}

type MealTab = 'plan' | 'recipes' | 'pantry' | 'shopping' | 'preferences';

export const MealPlannerApp: React.FC<MealPlannerAppProps> = ({
  userProfile,
  onBackToHub,
  onOpenProfile,
}) => {
  const workspaceId = 'default_workspace';
  const authorId = userProfile?.id || 'family_admin';
  const authorName = userProfile?.displayName || 'Bakayise Family';

  // Active Tab
  const [activeTab, setActiveTab] = useState<MealTab>('plan');

  // Firestore state
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [preferences, setPreferences] = useState<FamilyMealPreferences>({
    workspaceId,
    householdMembersCount: 4,
    dietaryGoals: ['balanced', 'high_protein', 'budget_friendly'],
    weeklyFoodBudgetZAR: 1600,
    maxPrepTimeMinutes: 35,
    allergiesAndDislikes: [],
    favoriteIngredients: ['Chicken', 'Sweet potatoes', 'Garlic', 'Basmati rice', 'Olive oil'],
    updatedAt: new Date().toISOString(),
  });

  // Modal states
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<MealItem | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  // Filter state for Recipes Tab
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeTypeFilter, setRecipeTypeFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubMeals = subscribeToMeals(workspaceId, (fetched) => {
      setMeals(fetched);
    });

    const unsubPlans = subscribeToMealPlans(workspaceId, (fetched) => {
      setPlans(fetched);
    });

    const unsubPantry = subscribeToPantry(workspaceId, (fetched) => {
      setPantryItems(fetched);
    });

    const unsubShopping = subscribeToShoppingList(workspaceId, (fetched) => {
      setShoppingItems(fetched);
    });

    const unsubPrefs = subscribeToFamilyMealPreferences(workspaceId, (fetched) => {
      if (fetched) setPreferences(fetched);
    });

    // Automatically check and seed starter data if collection is completely fresh
    seedStarterMealPlannerIfEmpty(workspaceId, authorId, authorName).catch((e) =>
      console.warn('Initial meal planner seed check notice:', e)
    );

    return () => {
      unsubMeals();
      unsubPlans();
      unsubPantry();
      unsubShopping();
      unsubPrefs();
    };
  }, [workspaceId, authorId, authorName]);

  // Current active weekly meal plan
  const currentPlan = useMemo(() => {
    return plans.find((p) => p.isCurrent) || plans[0] || null;
  }, [plans]);

  // Filtered recipes
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      const matchesSearch =
        !recipeSearch.trim() ||
        meal.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        meal.description.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        meal.tags.some((t) => t.toLowerCase().includes(recipeSearch.toLowerCase()));

      const matchesType = recipeTypeFilter === 'all' || meal.type === recipeTypeFilter;
      const matchesFav = !onlyFavorites || !!meal.isFavorite;

      return matchesSearch && matchesType && matchesFav;
    });
  }, [meals, recipeSearch, recipeTypeFilter, onlyFavorites]);

  // Handlers
  const handleToggleFavorite = async (mealId: string) => {
    const target = meals.find((m) => m.id === mealId);
    if (!target) return;
    await saveMeal({
      ...target,
      isFavorite: !target.isFavorite,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveMeal = async (meal: MealItem) => {
    await saveMeal(meal);
  };

  const handleSavePlan = async (plan: MealPlan) => {
    await saveMealPlan(plan);
  };

  const handleSavePantryItem = async (item: PantryItem) => {
    await savePantryItem(item);
  };

  const handleDeletePantryItem = async (itemId: string) => {
    await deletePantryItem(itemId);
  };

  const handleTogglePantryStock = async (itemId: string, inStock: boolean) => {
    const target = pantryItems.find((p) => p.id === itemId);
    if (!target) return;
    await savePantryItem({
      ...target,
      inStock,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveShoppingItem = async (item: ShoppingListItem) => {
    await saveShoppingItem(item);
  };

  const handleDeleteShoppingItem = async (itemId: string) => {
    await deleteShoppingItem(itemId);
  };

  const handleToggleShoppingItem = async (itemId: string, checked: boolean) => {
    const target = shoppingItems.find((s) => s.id === itemId);
    if (!target) return;
    await saveShoppingItem({
      ...target,
      checked,
    });
  };

  const handleClearCheckedShopping = async () => {
    await clearCheckedShoppingItems(workspaceId);
  };

  const handleAddMultipleToShopping = async (
    items: Array<{ name: string; category: string; quantity: string; estimatedPriceZAR?: number }>
  ) => {
    for (const it of items) {
      await saveShoppingItem({
        id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: it.name,
        category: it.category || 'Fresh Produce',
        quantity: it.quantity || '1',
        unit: '',
        checked: false,
        estimatedPriceZAR: it.estimatedPriceZAR,
        workspaceId,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleScheduleMeal = (meal: MealItem) => {
    setActiveTab('plan');
    // If a plan exists, add to first empty dinner slot or Monday dinner
    if (currentPlan) {
      const mondayDinnerIndex = currentPlan.slots.findIndex(
        (s) => s.dayOfWeek === 'monday' && s.type === meal.type
      );
      const updatedSlots = [...currentPlan.slots];
      if (mondayDinnerIndex >= 0) {
        updatedSlots[mondayDinnerIndex] = {
          ...updatedSlots[mondayDinnerIndex],
          mealId: meal.id,
          mealTitle: meal.title,
        };
      } else {
        updatedSlots.push({
          id: `slot_monday_${meal.type}`,
          dayOfWeek: 'monday',
          type: meal.type,
          mealId: meal.id,
          mealTitle: meal.title,
        });
      }
      saveMealPlan({
        ...currentPlan,
        slots: updatedSlots,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      id="meal-planner-app"
      className="min-h-screen bg-[#0a0c12] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950"
    >
      {/* TOP APPLICATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0d0f17]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToHub && (
              <button
                id="meal-planner-back-hub-btn"
                onClick={onBackToHub}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                title="Back to Apps Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                    Meal Planner
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    AI Nutrition
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {authorName} • {preferences.householdMembersCount} Portions
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="meal-planner-ai-suggest-btn"
              onClick={() => setIsAIModalOpen(true)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">✨ AI Meal Ideas</span>
              <span className="inline sm:hidden">AI Ideas</span>
            </button>

            <button
              id="meal-planner-prefs-btn"
              onClick={() => setIsPreferencesModalOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
              title="Family Dietary Preferences"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION SUB-BAR (TABS) */}
      <nav className="bg-[#0f111a] border-b border-white/[0.06] px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
          <button
            id="meal-tab-plan"
            onClick={() => setActiveTab('plan')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 border ${
              activeTab === 'plan'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Weekly Plan</span>
          </button>

          <button
            id="meal-tab-recipes"
            onClick={() => setActiveTab('recipes')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 border ${
              activeTab === 'recipes'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Recipe Library ({meals.length})</span>
          </button>

          <button
            id="meal-tab-pantry"
            onClick={() => setActiveTab('pantry')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 border ${
              activeTab === 'pantry'
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Pantry ({pantryItems.filter((p) => p.inStock).length})</span>
          </button>

          <button
            id="meal-tab-shopping"
            onClick={() => setActiveTab('shopping')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 border ${
              activeTab === 'shopping'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Grocery List ({shoppingItems.filter((i) => !i.checked).length})</span>
          </button>
        </div>
      </nav>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: WEEKLY PLAN CALENDAR */}
        {activeTab === 'plan' && (
          <WeeklyMealCalendar
            currentPlan={currentPlan}
            savedMeals={meals}
            pantryItems={pantryItems}
            onSavePlan={handleSavePlan}
            onOpenRecipeDetail={(meal) => setSelectedMealForDetail(meal)}
            onOpenAIGenerator={() => setIsAIModalOpen(true)}
            onAddIngredientsToShoppingList={handleAddMultipleToShopping}
            workspaceId={workspaceId}
          />
        )}

        {/* TAB 2: RECIPE LIBRARY */}
        {activeTab === 'recipes' && (
          <div className="space-y-5">
            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="recipe-search-input"
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes, ingredients, tags (e.g. Chicken, Stew, Low-Carb)..."
                  className="w-full bg-[#12151e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* CATEGORY FILTER */}
                <div className="flex items-center gap-1 bg-[#12151e] border border-white/10 rounded-xl p-1">
                  {['all', 'dinner', 'lunch', 'breakfast'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setRecipeTypeFilter(t)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold capitalize transition ${
                        recipeTypeFilter === t
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* FAVORITES ONLY TOGGLE */}
                <button
                  id="recipe-filter-favs"
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    onlyFavorites
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-[#12151e] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-rose-400' : ''}`} />
                  <span>Favorites</span>
                </button>

                {/* CREATE NEW RECIPE BUTTON */}
                <button
                  id="recipe-create-new-btn"
                  onClick={() => {
                    setEditingMeal(null);
                    setIsEditModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Recipe</span>
                </button>
              </div>
            </div>

            {/* RECIPES GRID */}
            {filteredMeals.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#12151e] border border-white/[0.08] text-center space-y-3">
                <ChefHat className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No matching recipes found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing your search filters, or click "✨ AI Meal Ideas" to generate fresh recipes tailored to your pantry!
                </p>
                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate with AI</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMeals.map((meal) => (
                  <RecipeCard
                    key={meal.id}
                    meal={meal}
                    onSelectMeal={(m) => setSelectedMealForDetail(m)}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickSchedule={handleScheduleMeal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PANTRY MANAGER */}
        {activeTab === 'pantry' && (
          <PantryManager
            pantryItems={pantryItems}
            onSaveItem={handleSavePantryItem}
            onDeleteItem={handleDeletePantryItem}
            onToggleStock={handleTogglePantryStock}
            onLaunchPantryAI={() => setIsAIModalOpen(true)}
            workspaceId={workspaceId}
          />
        )}

        {/* TAB 4: SMART SHOPPING LIST */}
        {activeTab === 'shopping' && (
          <SmartShoppingList
            items={shoppingItems}
            onSaveItem={handleSaveShoppingItem}
            onDeleteItem={handleDeleteShoppingItem}
            onToggleItem={handleToggleShoppingItem}
            onClearChecked={handleClearCheckedShopping}
            workspaceId={workspaceId}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. AI MEAL GENERATOR */}
      <AIMealGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        pantryItems={pantryItems}
        preferences={preferences}
        workspaceId={workspaceId}
        authorId={authorId}
        authorName={authorName}
        onSaveMeal={handleSaveMeal}
        onScheduleMealDirectly={handleScheduleMeal}
        onAddShoppingItems={handleAddMultipleToShopping}
      />

      {/* 2. RECIPE DETAIL & SERVING SCALER */}
      <MealDetailModal
        meal={selectedMealForDetail}
        isOpen={!!selectedMealForDetail}
        onClose={() => setSelectedMealForDetail(null)}
        onToggleFavorite={handleToggleFavorite}
        onAddToShoppingList={handleAddMultipleToShopping}
        onScheduleMeal={handleScheduleMeal}
      />

      {/* 3. RECIPE CREATOR / EDITOR */}
      <MealEditModal
        meal={editingMeal}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveMeal={handleSaveMeal}
        workspaceId={workspaceId}
        authorId={authorId}
        authorName={authorName}
      />

      {/* 4. FAMILY PREFERENCES & NUTRITION GOALS */}
      <FamilyPreferencesModal
        preferences={preferences}
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        onSavePreferences={async (newPrefs) => {
          await saveFamilyMealPreferences(newPrefs);
          setPreferences(newPrefs);
        }}
      />
    </div>
  );
};
