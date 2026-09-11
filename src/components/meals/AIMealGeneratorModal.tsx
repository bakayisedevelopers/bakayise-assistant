import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  ChefHat,
  Flame,
  Clock,
  DollarSign,
  Plus,
  Check,
  CheckCircle2,
  ShoppingCart,
  BookOpen,
  ArrowRight,
  Package,
} from 'lucide-react';
import {
  MealItem,
  MealType,
  PantryItem,
  FamilyMealPreferences,
} from '../../types';
import {
  requestAIMealSuggestions,
  AIMealSuggestionResponse,
} from '../../services/mealAIService';
import { formatZAR } from '../../utils/southAfricaHolidays';

interface AIMealGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
  preferences: FamilyMealPreferences;
  workspaceId: string;
  authorId?: string;
  authorName?: string;
  onSaveMeal: (meal: MealItem) => Promise<void>;
  onScheduleMealDirectly?: (meal: MealItem) => void;
  onAddShoppingItems?: (items: Array<{ name: string; category: string; quantity: string; estimatedPriceZAR?: number }>) => void;
}

export const AIMealGeneratorModal: React.FC<AIMealGeneratorModalProps> = ({
  isOpen,
  onClose,
  pantryItems,
  preferences,
  workspaceId,
  authorId = 'family_member',
  authorName = 'Family Member',
  onSaveMeal,
  onScheduleMealDirectly,
  onAddShoppingItems,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'suggest_meals' | 'weekly_schedule' | 'pantry_challenge'>('suggest_meals');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIMealSuggestionResponse | null>(null);
  const [savedMeals, setSavedMeals] = useState<Record<string, boolean>>({});
  const [addedShopping, setAddedShopping] = useState(false);

  const presetChips = [
    'Traditional South African Comfort Meals',
    'High-Protein & Low-Carb Dinners',
    'Quick 25-Minute Weeknight Dinners',
    'Budget-Friendly Meals under R100',
    'Cook strictly using my Pantry ingredients',
    'Kid-Friendly & Picky-Eater Approved',
  ];

  const handleGenerate = async (overridePrompt?: string) => {
    setLoading(true);
    setResult(null);
    setSavedMeals({});

    const effectivePrompt = overridePrompt !== undefined ? overridePrompt : customPrompt;

    try {
      const resp = await requestAIMealSuggestions({
        mode,
        mealType,
        prompt: effectivePrompt,
        preferences,
        pantryItems,
        workspaceId,
      });
      setResult(resp);
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMealToLibrary = async (rawMeal: any, index: number) => {
    const mealId = `meal_ai_${Date.now()}_${index}`;
    const fullMeal: MealItem = {
      ...rawMeal,
      id: mealId,
      workspaceId,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveMeal(fullMeal);
    setSavedMeals((prev) => ({ ...prev, [index]: true }));
  };

  const handleAddSuggestedShopping = () => {
    if (!result?.shoppingAdditions || !onAddShoppingItems) return;
    onAddShoppingItems(result.shoppingAdditions);
    setAddedShopping(true);
    setTimeout(() => setAddedShopping(false), 2500);
  };

  return (
    <div
      id="ai-meal-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="ai-meal-modal-container"
        className="relative w-full max-w-3xl bg-[#0f1118] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 max-h-[92vh] flex flex-col"
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-teal-500/10 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  AI Meal Suggestions
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tailored to your family size ({preferences.householdMembersCount} ppl), dietary goals & pantry inventory
              </p>
            </div>
          </div>

          <button
            id="ai-meal-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* USER CONTEXT SUMMARY STRIP */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Goals:</span>
              <span className="font-semibold text-white capitalize">
                {(preferences.dietaryGoals || ['balanced']).join(', ').replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" />
              <span className="text-slate-400">Pantry Items:</span>
              <span className="font-semibold text-teal-300">
                {pantryItems.filter((p) => p.inStock).length} in stock
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Weekly Target:</span>
              <span className="font-semibold text-emerald-300">
                {formatZAR(preferences.weeklyFoodBudgetZAR || 1600)}
              </span>
            </div>
          </div>

          {/* MODE SELECTOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Planning Objective
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('suggest_meals')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'suggest_meals'
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-amber-300">Dinner Ideas</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  2-3 tailored family meals
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('pantry_challenge')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'pantry_challenge'
                    ? 'bg-teal-500/15 border-teal-500/40 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-teal-300">Pantry Challenge</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Cook with what you have
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('weekly_schedule')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'weekly_schedule'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-cyan-300">Weekly Variety</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Balanced meal rotation
                </span>
              </button>
            </div>
          </div>

          {/* MEAL TYPE SELECTOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Meal Category
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(['dinner', 'lunch', 'breakfast', 'snack'] as MealType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealType(t)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                    mealType === t
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Popular Flavor Profiles & Constraints
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presetChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCustomPrompt(chip);
                    handleGenerate(chip);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-amber-500/15 hover:border-amber-500/30 border border-white/[0.08] text-slate-300 hover:text-amber-200 transition text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* CUSTOM PROMPT INPUT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Specific Family Request (Optional)
            </label>
            <div className="relative">
              <input
                id="ai-meal-custom-prompt-input"
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Needs to use the hake in the freezer, high protein, under 30 mins..."
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
              />
              <button
                id="ai-meal-generate-btn"
                type="button"
                onClick={() => handleGenerate()}
                disabled={loading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:from-amber-400 hover:to-orange-400 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Meals</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* GENERATION RESULTS SECTION */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-amber-400 mb-3" />
              <h3 className="text-sm font-bold text-white">
                Gemini AI is crafting personalized family recipes...
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Analyzing your pantry stock, South African culinary preferences, and nutritional goals.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4 pt-2 border-t border-white/[0.08]">
              {result.aiAdvice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">Chef's Advice & Batch-Cooking Tip</span>
                    <p className="leading-relaxed">{result.aiAdvice}</p>
                  </div>
                </div>
              )}

              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Suggested Recipes ({result.meals.length})</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Powered by {result.modelUsed}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.meals.map((m, idx) => {
                  const isSaved = !!savedMeals[idx];
                  const totalTime = (m.prepTimeMinutes || 0) + (m.cookTimeMinutes || 0);

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#141722] border border-white/[0.08] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl p-1.5 rounded-lg bg-white/5 border border-white/10">
                              {m.imageOrEmoji || '🍲'}
                            </span>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                {m.type}
                              </span>
                              {m.cuisine && (
                                <span className="text-[10px] font-medium text-slate-400 ml-1.5">
                                  {m.cuisine}
                                </span>
                              )}
                            </div>
                          </div>

                          {m.pantryMatchPercentage !== undefined && m.pantryMatchPercentage > 50 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {m.pantryMatchPercentage}% in pantry
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {m.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {m.description}
                        </p>

                        {/* STATS */}
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{totalTime}m</span>
                          </div>
                          {m.nutrition?.calories && (
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-orange-400" />
                              <span>{m.nutrition.calories} kcal</span>
                            </div>
                          )}
                          {m.estimatedCostZAR !== undefined && (
                            <div className="font-bold text-teal-300">
                              {formatZAR(m.estimatedCostZAR)}
                            </div>
                          )}
                        </div>

                        {/* INGREDIENTS PREVIEW */}
                        <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Ingredients ({m.ingredients.length})
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {m.ingredients.slice(0, 5).map((ing, i) => (
                              <span
                                key={i}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  ing.inPantry
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    : 'bg-white/5 text-slate-300 border-white/10'
                                }`}
                              >
                                {ing.name}
                              </span>
                            ))}
                            {m.ingredients.length > 5 && (
                              <span className="text-[10px] text-slate-400">
                                +{m.ingredients.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CARD ACTIONS */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveMealToLibrary(m, idx)}
                          disabled={isSaved}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                            isSaved
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Saved to Library</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save to Library</span>
                            </>
                          )}
                        </button>

                        {onScheduleMealDirectly && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveMealToLibrary(m, idx);
                              const fullMeal: MealItem = {
                                ...m,
                                id: `meal_ai_${Date.now()}_${idx}`,
                                workspaceId,
                                authorId,
                                authorName,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                              onScheduleMealDirectly(fullMeal);
                              onClose();
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                            title="Schedule this meal"
                          >
                            Plan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SHOPPING ADDITIONS BAR */}
              {result.shoppingAdditions && result.shoppingAdditions.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-teal-950/30 border border-teal-500/30 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-teal-300 block">
                      Missing ingredients detected for these meals ({result.shoppingAdditions.length} items)
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {result.shoppingAdditions.map((s) => s.name).join(', ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSuggestedShopping}
                    disabled={addedShopping}
                    className="px-3.5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-teal-400 transition"
                  >
                    {addedShopping ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added to Shopping List!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Grocery List</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#0a0c12] border-t border-white/[0.08] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
