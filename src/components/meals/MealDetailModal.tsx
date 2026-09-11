import React, { useState } from 'react';
import {
  X,
  Clock,
  Flame,
  DollarSign,
  Users,
  Check,
  Plus,
  ShoppingCart,
  Sparkles,
  Heart,
  Share2,
  BookOpen,
} from 'lucide-react';
import { MealItem, ShoppingListItem } from '../../types';
import { formatZAR } from '../../utils/southAfricaHolidays';

interface MealDetailModalProps {
  meal: MealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (mealId: string) => void;
  onAddToShoppingList?: (items: Array<{ name: string; category: string; quantity: string; estimatedPriceZAR?: number }>) => void;
  onScheduleMeal?: (meal: MealItem) => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  meal,
  isOpen,
  onClose,
  onToggleFavorite,
  onAddToShoppingList,
  onScheduleMeal,
}) => {
  if (!isOpen || !meal) return null;

  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  const baseServings = meal.servings || 4;
  const currentServings = Math.round(baseServings * servingMultiplier);

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddAllToCart = () => {
    if (!onAddToShoppingList) return;

    const itemsToAdd = meal.ingredients.map((ing) => {
      const amountNum = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)) || 1;
      const scaledAmount = Math.round(amountNum * servingMultiplier * 10) / 10;
      return {
        name: ing.name,
        category: typeof ing.category === 'string' ? ing.category : 'General',
        quantity: `${scaledAmount} ${ing.unit}`,
        estimatedPriceZAR: Math.round(((meal.estimatedCostZAR || 100) / (meal.ingredients.length || 1)) * servingMultiplier),
      };
    });

    onAddToShoppingList(itemsToAdd);
    setAddedToCartSuccess(true);
    setTimeout(() => setAddedToCartSuccess(false), 2500);
  };

  return (
    <div
      id="meal-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="meal-detail-modal-container"
        className="relative w-full max-w-2xl bg-[#11131a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 max-h-[92vh] flex flex-col"
      >
        {/* HEADER HERO */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 shadow-inner">
                {meal.imageOrEmoji || '🍽️'}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {meal.type}
                  </span>
                  {meal.cuisine && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                      {meal.cuisine}
                    </span>
                  )}
                  {meal.source === 'ai_suggested' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Suggested
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight tracking-tight">
                  {meal.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onToggleFavorite && (
                <button
                  id="meal-detail-favorite-btn"
                  onClick={() => onToggleFavorite(meal.id)}
                  className={`p-2 rounded-xl transition border ${
                    meal.isFavorite
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Favorite Recipe"
                >
                  <Heart className={`w-4 h-4 ${meal.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>
              )}
              <button
                id="meal-detail-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {meal.description}
          </p>

          {meal.whySuggested && (
            <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-start gap-2 text-xs text-cyan-200">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{meal.whySuggested}</span>
            </div>
          )}

          {/* KEY METRICS BAR */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/[0.06] text-center">
            <div className="p-2 rounded-lg bg-black/25 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Time</span>
              </div>
              <span className="text-xs font-bold text-white">
                {(meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0)} min
              </span>
            </div>

            <div className="p-2 rounded-lg bg-black/25 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>Calories</span>
              </div>
              <span className="text-xs font-bold text-white">
                {meal.nutrition?.calories ? `${meal.nutrition.calories} kcal` : '~450 kcal'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-black/25 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Servings</span>
              </div>
              <span className="text-xs font-bold text-white">
                {currentServings} ppl
              </span>
            </div>

            <div className="p-2 rounded-lg bg-black/25 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <DollarSign className="w-3 h-3 text-teal-400" />
                <span>Est. Cost</span>
              </div>
              <span className="text-xs font-bold text-white">
                {formatZAR(Math.round((meal.estimatedCostZAR || 100) * servingMultiplier))}
              </span>
            </div>
          </div>
        </div>

        {/* BODY SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* NUTRITIONAL MACROS */}
          {meal.nutrition && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Nutritional Breakdown (per serving)
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">Protein</span>
                  <span className="text-base font-black text-white">{meal.nutrition.protein || 0}g</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Energy & Muscle</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <span className="text-[10px] text-amber-400 font-semibold block uppercase tracking-wider">Carbs</span>
                  <span className="text-base font-black text-white">{meal.nutrition.carbs || 0}g</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Clean Energy</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <span className="text-[10px] text-orange-400 font-semibold block uppercase tracking-wider">Healthy Fats</span>
                  <span className="text-base font-black text-white">{meal.nutrition.fats || 0}g</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Satiety</span>
                </div>
              </div>
            </div>
          )}

          {/* INGREDIENTS WITH SERVING SLIDER */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Ingredients List</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({meal.ingredients.length} items)
                  </span>
                </h3>
              </div>

              {/* SERVING MULTIPLIER BUTTONS */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                <span className="text-[10px] text-slate-400 px-1.5">Scale:</span>
                {[0.5, 1, 1.5, 2].map((m) => (
                  <button
                    key={m}
                    onClick={() => setServingMultiplier(m)}
                    className={`px-2 py-0.5 text-xs rounded font-medium transition ${
                      servingMultiplier === m
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {meal.ingredients.map((ing) => {
                const amountNum = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)) || 0;
                const scaledAmount = amountNum ? Math.round(amountNum * servingMultiplier * 10) / 10 : ing.amount;
                const isChecked = !!checkedIngredients[ing.id];

                return (
                  <div
                    key={ing.id}
                    onClick={() => toggleIngredientCheck(ing.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-400 line-through'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{ing.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300">
                        {scaledAmount} {ing.unit}
                      </span>
                      {ing.inPantry ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          In Pantry
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Need
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP-BY-STEP INSTRUCTIONS */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Step-by-Step Cooking Instructions</span>
            </h3>
            <div className="space-y-3">
              {meal.instructions.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* TAGS */}
          {meal.tags && meal.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Dietary & Category Tags
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {meal.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-[#0e1017] border-t border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
          <button
            id="meal-detail-add-cart-btn"
            onClick={handleAddAllToCart}
            disabled={addedToCartSuccess}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition border ${
              addedToCartSuccess
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
            }`}
          >
            {addedToCartSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Added to Grocery List!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span>Add Ingredients to Grocery List</span>
              </>
            )}
          </button>

          {onScheduleMeal && (
            <button
              id="meal-detail-schedule-btn"
              onClick={() => {
                onScheduleMeal(meal);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Weekly Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
