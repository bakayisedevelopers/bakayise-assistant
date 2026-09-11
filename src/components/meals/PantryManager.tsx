import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';
import { PantryItem, PantryCategory } from '../../types';

interface PantryManagerProps {
  pantryItems: PantryItem[];
  onSaveItem: (item: PantryItem) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onToggleStock: (itemId: string, inStock: boolean) => Promise<void>;
  onLaunchPantryAI: () => void;
  workspaceId: string;
}

const CATEGORIES: { id: PantryCategory; label: string; emoji: string }[] = [
  { id: 'produce', label: 'Fresh Produce', emoji: '🥦' },
  { id: 'meat_protein', label: 'Meat & Protein', emoji: '🥩' },
  { id: 'dairy_eggs', label: 'Dairy & Eggs', emoji: '🥚' },
  { id: 'grains_pantry', label: 'Grains & Pantry Staples', emoji: '🌾' },
  { id: 'spices_sauces', label: 'Spices, Oils & Sauces', emoji: '🧂' },
  { id: 'frozen', label: 'Frozen Goods', emoji: '🧊' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

export const PantryManager: React.FC<PantryManagerProps> = ({
  pantryItems,
  onSaveItem,
  onDeleteItem,
  onToggleStock,
  onLaunchPantryAI,
  workspaceId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Item State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<PantryCategory>('produce');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState('units');

  const filteredItems = useMemo(() => {
    return pantryItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [pantryItems, selectedCategory, searchQuery]);

  const inStockCount = useMemo(() => pantryItems.filter((p) => p.inStock).length, [pantryItems]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: PantryItem = {
      id: `pantry_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      quantity: Number(newQuantity) || 1,
      unit: newUnit.trim() || 'units',
      inStock: true,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };

    await onSaveItem(newItem);
    setNewName('');
    setIsAddModalOpen(false);
  };

  return (
    <div id="pantry-manager-view" className="space-y-5">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#11131c] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Pantry & Fridge Inventory
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
              {inStockCount} In Stock
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Keep track of what ingredients you already have to reduce food waste and save on groceries
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="pantry-ai-cook-btn"
            onClick={onLaunchPantryAI}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Cook from My Pantry</span>
          </button>

          <button
            id="pantry-add-item-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="pantry-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pantry items (chicken, rice, onions, eggs)..."
            className="w-full bg-[#12151e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
              selectedCategory === 'all'
                ? 'bg-teal-500 text-slate-950 border-teal-500'
                : 'bg-[#12151e] border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            All Items ({pantryItems.length})
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 border ${
                selectedCategory === cat.id
                  ? 'bg-teal-500 text-slate-950 border-teal-500'
                  : 'bg-[#12151e] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* INVENTORY ITEMS GRID */}
      {filteredItems.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#12151e] border border-white/[0.08] text-center space-y-2">
          <Package className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No pantry items found</h3>
          <p className="text-xs text-slate-500">
            {searchQuery ? 'Try clearing your search query' : 'Add ingredients to track what you have in your kitchen'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item) => {
            const categoryObj = CATEGORIES.find((c) => c.id === item.category);

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.inStock
                    ? 'bg-[#121520] border-white/[0.08] hover:border-teal-500/30'
                    : 'bg-[#0f1118]/60 border-white/[0.04] opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl p-1.5 rounded-xl bg-white/5 border border-white/10">
                    {categoryObj?.emoji || '📦'}
                  </span>
                  <div className="min-w-0">
                    <h4 className={`text-sm font-bold truncate ${item.inStock ? 'text-white' : 'text-slate-400 line-through'}`}>
                      {item.name}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onToggleStock(item.id, !item.inStock)}
                    className={`p-1.5 rounded-lg border transition ${
                      item.inStock
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                    }`}
                    title={item.inStock ? 'Mark as Out of Stock' : 'Mark as In Stock'}
                  >
                    {item.inStock ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div
          id="add-pantry-item-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#13151f] border border-teal-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white">Add Ingredient to Pantry</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Free-Range Eggs, Basmati Rice, Olive Oil"
                  className="w-full bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="units, g, kg, ml, cans"
                    className="w-full bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as PantryCategory)}
                  className="w-full bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
                >
                  Save to Pantry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
