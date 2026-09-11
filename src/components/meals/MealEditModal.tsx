import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Clock,
  Flame,
  DollarSign,
  Utensils,
} from 'lucide-react';
import { MealItem, MealType, MealIngredient } from '../../types';

interface MealEditModalProps {
  meal?: MealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveMeal: (meal: MealItem) => Promise<void>;
  workspaceId: string;
  authorId?: string;
  authorName?: string;
}

export const MealEditModal: React.FC<MealEditModalProps> = ({
  meal,
  isOpen,
  onClose,
  onSaveMeal,
  workspaceId,
  authorId = 'family_member',
  authorName = 'Family Member',
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(meal?.title || '');
  const [description, setDescription] = useState(meal?.description || '');
  const [type, setType] = useState<MealType>(meal?.type || 'dinner');
  const [cuisine, setCuisine] = useState(meal?.cuisine || 'South African');
  const [prepTime, setPrepTime] = useState(meal?.prepTimeMinutes || 15);
  const [cookTime, setCookTime] = useState(meal?.cookTimeMinutes || 25);
  const [servings, setServings] = useState(meal?.servings || 4);
  const [costZAR, setCostZAR] = useState(meal?.estimatedCostZAR || 100);
  const [imageEmoji, setImageEmoji] = useState(meal?.imageOrEmoji || '🍲');

  const [ingredients, setIngredients] = useState<MealIngredient[]>(
    meal?.ingredients || [
      { id: '1', name: '', amount: 1, unit: 'unit' },
    ]
  );

  const [instructions, setInstructions] = useState<string[]>(
    meal?.instructions || ['']
  );

  const [saving, setSaving] = useState(false);

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: `ing_${Date.now()}`, name: '', amount: 1, unit: 'unit' },
    ]);
  };

  const handleUpdateIngredient = (idx: number, field: keyof MealIngredient, val: any) => {
    const copy = [...ingredients];
    copy[idx] = { ...copy[idx], [field]: val };
    setIngredients(copy);
  };

  const handleRemoveIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleUpdateInstruction = (idx: number, text: string) => {
    const copy = [...instructions];
    copy[idx] = text;
    setInstructions(copy);
  };

  const handleRemoveInstruction = (idx: number) => {
    setInstructions(instructions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedMeal: MealItem = {
        id: meal?.id || `meal_custom_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        type,
        cuisine: cuisine.trim(),
        prepTimeMinutes: Number(prepTime) || 15,
        cookTimeMinutes: Number(cookTime) || 20,
        servings: Number(servings) || 4,
        estimatedCostZAR: Number(costZAR) || 100,
        imageOrEmoji: imageEmoji.trim() || '🍲',
        ingredients: ingredients.filter((ing) => ing.name.trim()),
        instructions: instructions.filter((inst) => inst.trim()),
        tags: meal?.tags || [type, cuisine],
        source: meal?.source || 'custom',
        workspaceId,
        authorId: meal?.authorId || authorId,
        authorName: meal?.authorName || authorName,
        createdAt: meal?.createdAt || now,
        updatedAt: now,
      };

      await onSaveMeal(updatedMeal);
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="meal-edit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="meal-edit-modal-container"
        className="relative w-full max-w-2xl bg-[#11131c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {meal ? 'Edit Recipe' : 'Create Family Recipe'}
            </h2>
            <p className="text-xs text-slate-400">
              Add recipe details, ingredients, and instructions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Emoji
              </label>
              <input
                type="text"
                value={imageEmoji}
                onChange={(e) => setImageEmoji(e.target.value)}
                className="w-full text-center text-2xl bg-[#171924] border border-white/10 rounded-xl py-1.5 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Recipe Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Creamy Chicken & Mushroom Tagliatelle"
                className="w-full bg-[#171924] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Description / Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the meal..."
              className="w-full bg-[#171924] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Meal Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MealType)}
                className="w-full bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="dinner">Dinner</option>
                <option value="lunch">Lunch</option>
                <option value="breakfast">Breakfast</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Cuisine Style
              </label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="South African"
                className="w-full bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Prep & Cook Time
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                  placeholder="Prep"
                  className="w-1/2 bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center"
                />
                <span className="text-slate-500">+</span>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                  placeholder="Cook"
                  className="w-1/2 bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Est. Cost (ZAR)
              </label>
              <input
                type="number"
                value={costZAR}
                onChange={(e) => setCostZAR(parseFloat(e.target.value) || 0)}
                placeholder="100"
                className="w-full bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* INGREDIENTS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ingredients List
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                    placeholder="Ingredient name (e.g. Skinless chicken breasts)"
                    className="flex-1 bg-[#171924] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(idx, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-20 bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-20 bg-[#171924] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* STEP BY STEP INSTRUCTIONS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cooking Instructions
              </label>
              <button
                type="button"
                onClick={handleAddInstruction}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-xs font-bold flex items-center justify-center text-slate-400 shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                    placeholder={`Step ${idx + 1} instructions...`}
                    className="flex-1 bg-[#171924] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-orange-400 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Recipe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
