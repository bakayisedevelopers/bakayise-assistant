import React from 'react';
import {
  Clock,
  Flame,
  DollarSign,
  Sparkles,
  Heart,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { MealItem } from '../../types';
import { formatZAR } from '../../utils/southAfricaHolidays';

interface RecipeCardProps {
  meal: MealItem;
  onSelectMeal: (meal: MealItem) => void;
  onToggleFavorite?: (mealId: string) => void;
  onQuickSchedule?: (meal: MealItem) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  meal,
  onSelectMeal,
  onToggleFavorite,
  onQuickSchedule,
}) => {
  const totalTime = (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0);

  return (
    <div
      id={`recipe-card-${meal.id}`}
      className="group relative bg-[#12151e] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:shadow-amber-950/20"
    >
      <div>
        {/* TOP ROW: ICON, BADGES, AND FAVORITE */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform">
              {meal.imageOrEmoji || '🍽️'}
            </span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  {meal.type}
                </span>
                {meal.cuisine && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                    {meal.cuisine}
                  </span>
                )}
              </div>
              {meal.source === 'ai_suggested' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-cyan-300 mt-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Suggested
                </span>
              )}
            </div>
          </div>

          {onToggleFavorite && (
            <button
              id={`recipe-card-fav-btn-${meal.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(meal.id);
              }}
              className={`p-2 rounded-xl transition border ${
                meal.isFavorite
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${meal.isFavorite ? 'fill-rose-400' : ''}`} />
            </button>
          )}
        </div>

        {/* TITLE & DESCRIPTION */}
        <h3
          onClick={() => onSelectMeal(meal)}
          className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer"
        >
          {meal.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {meal.description}
        </p>

        {/* PANTRY MATCH BADGE */}
        {meal.pantryMatchPercentage !== undefined && meal.pantryMatchPercentage > 50 && (
          <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>{meal.pantryMatchPercentage}% in your pantry</span>
          </div>
        )}
      </div>

      {/* FOOTER STATS & ACTIONS */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalTime}m</span>
          </div>

          {meal.nutrition?.calories && (
            <div className="flex items-center gap-1 text-slate-400">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{meal.nutrition.calories} kcal</span>
            </div>
          )}

          {meal.nutrition?.protein && (
            <div className="text-[11px] font-semibold text-emerald-400">
              {meal.nutrition.protein}g protein
            </div>
          )}

          {meal.estimatedCostZAR !== undefined && (
            <div className="text-xs font-bold text-teal-300">
              {formatZAR(meal.estimatedCostZAR)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id={`recipe-card-view-btn-${meal.id}`}
            onClick={() => onSelectMeal(meal)}
            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5"
          >
            <span>View Recipe</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onQuickSchedule && (
            <button
              id={`recipe-card-schedule-btn-${meal.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickSchedule(meal);
              }}
              className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition"
              title="Add to plan"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
