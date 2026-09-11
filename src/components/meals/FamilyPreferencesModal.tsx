import React, { useState } from 'react';
import {
  X,
  Users,
  Check,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Heart,
  Save,
} from 'lucide-react';
import {
  FamilyMealPreferences,
  DietaryPreference,
} from '../../types';

interface FamilyPreferencesModalProps {
  preferences: FamilyMealPreferences;
  isOpen: boolean;
  onClose: () => void;
  onSavePreferences: (prefs: FamilyMealPreferences) => Promise<void>;
}

const DIETARY_OPTIONS: { id: DietaryPreference; label: string }[] = [
  { id: 'balanced', label: 'Balanced Family' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'low_carb', label: 'Low Carb' },
  { id: 'budget_friendly', label: 'Budget Friendly' },
  { id: 'quick_prep', label: 'Quick 30-min' },
  { id: 'gluten_free', label: 'Gluten-Free' },
  { id: 'dairy_free', label: 'Dairy-Free' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'keto', label: 'Keto' },
];

export const FamilyPreferencesModal: React.FC<FamilyPreferencesModalProps> = ({
  preferences,
  isOpen,
  onClose,
  onSavePreferences,
}) => {
  if (!isOpen) return null;

  const [householdMembersCount, setMembersCount] = useState(preferences.householdMembersCount || 4);
  const [dietaryGoals, setDietaryGoals] = useState<DietaryPreference[]>(preferences.dietaryGoals || ['balanced']);
  const [weeklyBudget, setWeeklyBudget] = useState(preferences.weeklyFoodBudgetZAR || 1600);
  const [maxPrepTime, setMaxPrepTime] = useState(preferences.maxPrepTimeMinutes || 35);
  const [allergies, setAllergies] = useState<string[]>(preferences.allergiesAndDislikes || []);
  const [newAllergyInput, setNewAllergyInput] = useState('');
  const [favorites, setFavorites] = useState<string[]>(preferences.favoriteIngredients || ['Chicken', 'Garlic', 'Basmati rice', 'Olive oil']);
  const [newFavoriteInput, setNewFavoriteInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleGoal = (g: DietaryPreference) => {
    if (dietaryGoals.includes(g)) {
      setDietaryGoals(dietaryGoals.filter((item) => item !== g));
    } else {
      setDietaryGoals([...dietaryGoals, g]);
    }
  };

  const handleAddAllergy = () => {
    if (!newAllergyInput.trim()) return;
    if (!allergies.includes(newAllergyInput.trim())) {
      setAllergies([...allergies, newAllergyInput.trim()]);
    }
    setNewAllergyInput('');
  };

  const handleRemoveAllergy = (idx: number) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  const handleAddFavorite = () => {
    if (!newFavoriteInput.trim()) return;
    if (!favorites.includes(newFavoriteInput.trim())) {
      setFavorites([...favorites, newFavoriteInput.trim()]);
    }
    setNewFavoriteInput('');
  };

  const handleRemoveFavorite = (idx: number) => {
    setFavorites(favorites.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSavePreferences({
        ...preferences,
        householdMembersCount: Number(householdMembersCount) || 4,
        dietaryGoals,
        weeklyFoodBudgetZAR: Number(weeklyBudget) || 1600,
        maxPrepTimeMinutes: Number(maxPrepTime) || 35,
        allergiesAndDislikes: allergies,
        favoriteIngredients: favorites,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="family-preferences-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="family-preferences-modal-container"
        className="relative w-full max-w-lg bg-[#11131c] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100"
      >
        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Family Nutrition & Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Informs the AI meal suggestions and recipe scaling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* HOUSEHOLD MEMBERS COUNT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Household Portions / Family Size
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMembersCount(count)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    householdMembersCount === count
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {count} {count === 1 ? 'person' : 'people'}
                </button>
              ))}
            </div>
          </div>

          {/* DIETARY GOALS CHIPS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Dietary & Health Goals
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = dietaryGoals.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleGoal(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BUDGET & TIME LIMIT */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Weekly Food Budget (ZAR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R</span>
                <input
                  type="number"
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#171924] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Max Prep Time (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={maxPrepTime}
                  onChange={(e) => setMaxPrepTime(parseInt(e.target.value) || 30)}
                  className="w-full bg-[#171924] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* ALLERGIES & DISLIKES */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Allergies & Disliked Foods
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newAllergyInput}
                onChange={(e) => setNewAllergyInput(e.target.value)}
                placeholder="e.g. Shellfish, Peanuts, Mushrooms..."
                className="flex-1 bg-[#171924] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200"
              >
                Add
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {allergies.map((all, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30"
                >
                  <span>{all}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(i)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              {allergies.length === 0 && (
                <span className="text-xs text-slate-500 italic">None specified</span>
              )}
            </div>
          </div>

          {/* FAVORITE INGREDIENTS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Favorite Family Staples & Ingredients
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newFavoriteInput}
                onChange={(e) => setNewFavoriteInput(e.target.value)}
                placeholder="e.g. Chicken, Sweet potatoes, Avocado, Basil..."
                className="flex-1 bg-[#171924] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFavorite();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddFavorite}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200"
              >
                Add
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {favorites.map((fav, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  <span>{fav}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(i)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-orange-400 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
