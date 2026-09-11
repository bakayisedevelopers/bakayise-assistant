import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Share2,
  Copy,
  DollarSign,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { ShoppingListItem } from '../../types';
import { formatZAR } from '../../utils/southAfricaHolidays';

interface SmartShoppingListProps {
  items: ShoppingListItem[];
  onSaveItem: (item: ShoppingListItem) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onClearChecked: () => Promise<void>;
  workspaceId: string;
}

export const SmartShoppingList: React.FC<SmartShoppingListProps> = ({
  items,
  onSaveItem,
  onDeleteItem,
  onToggleItem,
  onClearChecked,
  workspaceId,
}) => {
  const [newItemName, setNewName] = useState('');
  const [newItemCategory, setNewCategory] = useState('Fresh Produce');
  const [newItemQty, setNewQty] = useState('1');
  const [newItemPrice, setNewPrice] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const it of items) {
      const cat = it.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    }
    return groups;
  }, [items]);

  const totalCostZAR = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.estimatedPriceZAR || 0), 0);
  }, [items]);

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: ShoppingListItem = {
      id: `shop_${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: newItemQty.trim() || '1',
      unit: '',
      checked: false,
      estimatedPriceZAR: newItemPrice ? parseFloat(newItemPrice) : undefined,
      workspaceId,
      createdAt: new Date().toISOString(),
    };

    await onSaveItem(newItem);
    setNewName('');
    setNewPrice('');
  };

  const handleCopyList = () => {
    const textLines = [
      '🛒 *Family Grocery Shopping List:*',
      ...items.map((i) => `${i.checked ? '✅' : '◻️'} ${i.name} (${i.quantity}) ${i.estimatedPriceZAR ? `- R${i.estimatedPriceZAR}` : ''}`),
      `\n*Total Est. Cost:* ${formatZAR(totalCostZAR)}`,
    ];
    try {
      navigator.clipboard.writeText(textLines.join('\n'));
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch {}
  };

  return (
    <div id="smart-shopping-list-view" className="space-y-5">
      {/* HEADER CARD */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#11131c] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Smart Grocery Shopping List
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {items.length - checkedCount} to buy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generated from your weekly planned recipes and manual additions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {items.length > 0 && (
            <button
              id="shopping-copy-list-btn"
              onClick={handleCopyList}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
              title="Copy to clipboard for WhatsApp"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Share List</span>
                </>
              )}
            </button>
          )}

          {checkedCount > 0 && (
            <button
              id="shopping-clear-checked-btn"
              onClick={onClearChecked}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-bold text-rose-300 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Done ({checkedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* BASKET SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121520] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block font-medium">Estimated Basket Cost</span>
          <span className="text-lg font-black text-emerald-400 block mt-0.5">
            {formatZAR(totalCostZAR)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121520] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block font-medium">Items Progress</span>
          <span className="text-lg font-black text-white block mt-0.5">
            {checkedCount} / {items.length} bought
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#121520] border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Basket Status</span>
            <span className="text-xs font-bold text-amber-300 block mt-0.5">
              {checkedCount === items.length && items.length > 0
                ? 'All Items Purchased! 🎉'
                : 'Shopping in progress'}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK ADD ITEM FORM */}
      <form
        onSubmit={handleAddItem}
        className="p-3.5 rounded-2xl bg-[#121520] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <input
          id="shopping-new-item-input"
          type="text"
          required
          value={newItemName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add grocery item (e.g. Avocado, Greek Yogurt, Olive oil)..."
          className="flex-1 bg-[#1a1c28] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />

        <input
          type="text"
          value={newItemQty}
          onChange={(e) => setNewQty(e.target.value)}
          placeholder="Qty (e.g. 500g, 2 units)"
          className="w-full sm:w-28 bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />

        <input
          type="number"
          step="any"
          value={newItemPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="Price (ZAR)"
          className="w-full sm:w-28 bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />

        <select
          value={newItemCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="w-full sm:w-36 bg-[#1a1c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="Fresh Produce">🥦 Fresh Produce</option>
          <option value="Meat & Poultry">🥩 Meat & Poultry</option>
          <option value="Fish & Seafood">🐟 Fish & Seafood</option>
          <option value="Dairy & Cheese">🧀 Dairy & Cheese</option>
          <option value="Bakery & Bread">🍞 Bakery & Bread</option>
          <option value="Pantry Staples">🌾 Pantry Staples</option>
          <option value="Frozen Food">🧊 Frozen Food</option>
          <option value="Other">📦 Other</option>
        </select>

        <button
          id="shopping-add-btn"
          type="submit"
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center justify-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* ITEM LIST GROUPED BY CATEGORY */}
      {items.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#12151e] border border-white/[0.08] text-center space-y-2">
          <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Your grocery list is empty</h3>
          <p className="text-xs text-slate-500">
            Add items manually or use "Grocery List from Plan" in your weekly schedule!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(groupedItems) as [string, ShoppingListItem[]][]).map(([cat, catItems]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>{cat}</span>
                <span className="text-[10px] text-slate-500">({catItems.length})</span>
              </h3>

              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onToggleItem(item.id, !item.checked)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      item.checked
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-500 line-through'
                        : 'bg-[#121520] border-white/[0.08] hover:bg-[#151927] text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          item.checked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-semibold truncate block ${item.checked ? 'text-slate-400' : 'text-white'}`}>
                          {item.name}
                        </span>
                        {item.sourceMealTitle && (
                          <span className="text-[10px] text-amber-400/80 block">
                            For: {item.sourceMealTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-300 font-medium">
                        {item.quantity}
                      </span>

                      {item.estimatedPriceZAR !== undefined && (
                        <span className="text-xs font-bold text-teal-300">
                          {formatZAR(item.estimatedPriceZAR)}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
