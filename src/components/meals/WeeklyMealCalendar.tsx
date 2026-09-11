import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  Clock,
  Eye,
  X,
} from 'lucide-react';
import {
  MealPlan,
  MealPlanSlot,
  MealItem,
  DayOfWeek,
  MealType,
  PantryItem,
} from '../../types';

interface WeeklyMealCalendarProps {
  currentPlan: MealPlan | null;
  savedMeals: MealItem[];
  pantryItems: PantryItem[];
  onSavePlan: (plan: MealPlan) => Promise<void>;
  onOpenRecipeDetail: (meal: MealItem) => void;
  onOpenAIGenerator: () => void;
  onAddIngredientsToShoppingList: (items: Array<{ name: string; category: string; quantity: string; estimatedPriceZAR?: number }>) => void;
  workspaceId: string;
}

const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const MEAL_TYPES: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { type: 'lunch', label: 'Lunch', emoji: '🥗' },
  { type: 'dinner', label: 'Dinner', emoji: '🥘' },
];

export const WeeklyMealCalendar: React.FC<WeeklyMealCalendarProps> = ({
  currentPlan,
  savedMeals,
  pantryItems,
  onSavePlan,
  onOpenRecipeDetail,
  onOpenAIGenerator,
  onAddIngredientsToShoppingList,
  workspaceId,
}) => {
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>('monday');
  const [assigningSlot, setAssigningSlot] = useState<{ day: DayOfWeek; type: MealType } | null>(null);
  const [customMealTitle, setCustomMealTitle] = useState('');
  const [addedGroceryNotice, setAddedGroceryNotice] = useState(false);

  // Helper to find slot in plan
  const getSlot = (day: DayOfWeek, type: MealType): MealPlanSlot | undefined => {
    return currentPlan?.slots?.find((s) => s.dayOfWeek === day && s.type === type);
  };

  const handleAssignMeal = async (day: DayOfWeek, type: MealType, meal: MealItem) => {
    if (!currentPlan) return;

    const existingSlotIndex = currentPlan.slots.findIndex(
      (s) => s.dayOfWeek === day && s.type === type
    );

    const newSlot: MealPlanSlot = {
      id: `slot_${day}_${type}`,
      dayOfWeek: day,
      type,
      mealId: meal.id,
      mealTitle: meal.title,
    };

    let updatedSlots: MealPlanSlot[];
    if (existingSlotIndex >= 0) {
      updatedSlots = [...currentPlan.slots];
      updatedSlots[existingSlotIndex] = newSlot;
    } else {
      updatedSlots = [...currentPlan.slots, newSlot];
    }

    await onSavePlan({
      ...currentPlan,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    });

    setAssigningSlot(null);
  };

  const handleAssignCustom = async (day: DayOfWeek, type: MealType) => {
    if (!currentPlan || !customMealTitle.trim()) return;

    const existingSlotIndex = currentPlan.slots.findIndex(
      (s) => s.dayOfWeek === day && s.type === type
    );

    const newSlot: MealPlanSlot = {
      id: `slot_${day}_${type}`,
      dayOfWeek: day,
      type,
      mealTitle: customMealTitle.trim(),
    };

    let updatedSlots: MealPlanSlot[];
    if (existingSlotIndex >= 0) {
      updatedSlots = [...currentPlan.slots];
      updatedSlots[existingSlotIndex] = newSlot;
    } else {
      updatedSlots = [...currentPlan.slots, newSlot];
    }

    await onSavePlan({
      ...currentPlan,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    });

    setCustomMealTitle('');
    setAssigningSlot(null);
  };

  const handleRemoveSlot = async (day: DayOfWeek, type: MealType) => {
    if (!currentPlan) return;

    const updatedSlots = currentPlan.slots.filter(
      (s) => !(s.dayOfWeek === day && s.type === type)
    );

    await onSavePlan({
      ...currentPlan,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGenerateShoppingFromPlan = () => {
    if (!currentPlan) return;

    const pantryNames = pantryItems.filter((p) => p.inStock).map((p) => p.name.toLowerCase());
    const itemsToAdd: Array<{ name: string; category: string; quantity: string; estimatedPriceZAR?: number }> = [];

    // Find all meals in plan
    for (const slot of currentPlan.slots) {
      if (slot.mealId) {
        const fullMeal = savedMeals.find((m) => m.id === slot.mealId);
        if (fullMeal && fullMeal.ingredients) {
          for (const ing of fullMeal.ingredients) {
            const inStock = pantryNames.some((pName) => pName.includes(ing.name.toLowerCase()));
            if (!inStock) {
              itemsToAdd.push({
                name: ing.name,
                category: typeof ing.category === 'string' ? ing.category : 'Produce',
                quantity: `${ing.amount} ${ing.unit}`,
                estimatedPriceZAR: 25,
              });
            }
          }
        }
      }
    }

    if (itemsToAdd.length > 0) {
      onAddIngredientsToShoppingList(itemsToAdd);
      setAddedGroceryNotice(true);
      setTimeout(() => setAddedGroceryNotice(false), 3000);
    }
  };

  return (
    <div id="weekly-meal-calendar-view" className="space-y-5">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#11131c] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {currentPlan?.title || 'Weekly Family Meal Schedule'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Organized dinner & lunch calendar synced across all family devices
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="weekly-plan-generate-grocery-btn"
            onClick={handleGenerateShoppingFromPlan}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
          >
            {addedGroceryNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Added Missing Ingredients!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span>Grocery List from Plan</span>
              </>
            )}
          </button>

          <button
            id="weekly-plan-ai-auto-btn"
            onClick={onOpenAIGenerator}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ AI Meal Ideas</span>
          </button>
        </div>
      </div>

      {/* MOBILE DAY PILL TABS (Visible on < lg screens) */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1">
        {DAYS_OF_WEEK.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedMobileDay(d.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 border ${
              selectedMobileDay === d.id
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-[#12151e] border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span>{d.short}</span>
          </button>
        ))}
      </div>

      {/* DESKTOP 7-COLUMN GRID / MOBILE SINGLE DAY CARDS */}
      <div className="hidden lg:grid grid-cols-7 gap-2.5">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.id}
            className="p-3 rounded-2xl bg-[#121520] border border-white/[0.08] flex flex-col justify-between min-h-[440px]"
          >
            {/* DAY HEADER */}
            <div className="pb-2.5 mb-2.5 border-b border-white/[0.06] text-center">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                {day.label}
              </span>
            </div>

            {/* MEAL SLOTS */}
            <div className="flex-1 space-y-2.5">
              {MEAL_TYPES.map((m) => {
                const slot = getSlot(day.id, m.type);
                const fullMeal = slot?.mealId
                  ? savedMeals.find((sm) => sm.id === slot.mealId)
                  : null;

                return (
                  <div
                    key={m.type}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </span>

                      {slot && (
                        <button
                          onClick={() => handleRemoveSlot(day.id, m.type)}
                          className="text-slate-500 hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                          title="Remove from slot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {slot ? (
                      <div>
                        <h4
                          onClick={() => fullMeal && onOpenRecipeDetail(fullMeal)}
                          className={`text-xs font-bold leading-snug text-white line-clamp-2 ${
                            fullMeal ? 'hover:text-amber-300 cursor-pointer' : ''
                          }`}
                        >
                          {slot.mealTitle}
                        </h4>
                        {fullMeal && (
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              {(fullMeal.prepTimeMinutes || 0) + (fullMeal.cookTimeMinutes || 0)}m
                            </span>
                            {fullMeal.nutrition?.calories && (
                              <span>{fullMeal.nutrition.calories} kcal</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningSlot({ day: day.id, type: m.type })}
                        className="py-2 px-1 rounded-lg border border-dashed border-white/10 hover:border-amber-500/40 text-[11px] text-slate-500 hover:text-amber-300 transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Meal</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE SINGLE DAY VIEW */}
      <div className="block lg:hidden space-y-3">
        {DAYS_OF_WEEK.filter((d) => d.id === selectedMobileDay).map((day) => (
          <div
            key={day.id}
            className="p-4 rounded-2xl bg-[#121520] border border-white/[0.08] space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-amber-300">{day.label}</h3>
              <span className="text-xs text-slate-400">Planned Meals</span>
            </div>

            {MEAL_TYPES.map((m) => {
              const slot = getSlot(day.id, m.type);
              const fullMeal = slot?.mealId
                ? savedMeals.find((sm) => sm.id === slot.mealId)
                : null;

              return (
                <div
                  key={m.type}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-xl p-1.5 rounded-lg bg-white/5 border border-white/10">
                      {m.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {m.label}
                      </span>
                      {slot ? (
                        <div>
                          <h4
                            onClick={() => fullMeal && onOpenRecipeDetail(fullMeal)}
                            className={`text-sm font-bold text-white truncate ${
                              fullMeal ? 'hover:text-amber-300 cursor-pointer' : ''
                            }`}
                          >
                            {slot.mealTitle}
                          </h4>
                          {fullMeal && (
                            <span className="text-xs text-slate-400">
                              {(fullMeal.prepTimeMinutes || 0) + (fullMeal.cookTimeMinutes || 0)} min total
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No meal set</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {slot ? (
                      <div className="flex items-center gap-1.5">
                        {fullMeal && (
                          <button
                            onClick={() => onOpenRecipeDetail(fullMeal)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                            title="View recipe"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveSlot(day.id, m.type)}
                          className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningSlot({ day: day.id, type: m.type })}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Assign</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* QUICK MEAL PICKER MODAL FOR A SLOT */}
      {assigningSlot && (
        <div
          id="assign-slot-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#13151f] border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white capitalize">
                  Assign {assigningSlot.type} for {assigningSlot.day}
                </h3>
                <p className="text-xs text-slate-400">
                  Pick from your recipe library or enter custom meal
                </p>
              </div>
              <button
                onClick={() => setAssigningSlot(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CUSTOM TITLE QUICK INPUT */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customMealTitle}
                onChange={(e) => setCustomMealTitle(e.target.value)}
                placeholder="e.g. Braai Night, Leftover Stew..."
                className="flex-1 bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAssignCustom(assigningSlot.day, assigningSlot.type);
                }}
              />
              <button
                onClick={() => handleAssignCustom(assigningSlot.day, assigningSlot.type)}
                disabled={!customMealTitle.trim()}
                className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* RECIPE LIBRARY PICKER */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                From Your Saved Recipes ({savedMeals.length})
              </span>
              {savedMeals.map((meal) => (
                <div
                  key={meal.id}
                  onClick={() => handleAssignMeal(assigningSlot.day, assigningSlot.type, meal)}
                  className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-amber-500/15 border border-white/[0.06] hover:border-amber-500/30 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{meal.imageOrEmoji || '🍽️'}</span>
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {meal.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-amber-300 shrink-0 ml-2">
                    {(meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0)}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
