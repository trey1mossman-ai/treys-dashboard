import { useState } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, Save, Plus, Trash2, ExternalLink, 
  Package, AlertTriangle, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InventoryItem, InventoryCategory } from '@/types/mission-control';
import '@/styles/mission-control.css';

export default function MissionControlManage() {
  const { inventory, settings, updateSettings, updateInventoryItem } = useMissionControlStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<InventoryItem> | null>(null);
  
  const handleSaveThresholds = () => {
    updateSettings({ thresholds: localSettings.thresholds });
  };
  
  const handleSaveInventoryItem = (item: InventoryItem) => {
    updateInventoryItem(item.id, item);
    setEditingItem(null);
  };
  
  const handleAddItem = () => {
    setNewItem({
      id: `item-${Date.now()}`,
      name: '',
      category: 'food',
      unit: 'units',
      current_qty: 0,
      min_qty: 0,
      last_updated: new Date().toISOString()
    });
  };
  
  const handleSaveNewItem = () => {
    if (newItem && newItem.name) {
      // In a real app, this would call an API
      // For now, just add to local store
      useMissionControlStore.getState().setInventory([
        ...inventory,
        newItem as InventoryItem
      ]);
      setNewItem(null);
    }
  };
  
  return (
    <div className="mc-container min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-mc-border">
        <div className="flex items-center gap-4">
          <Link
            to="/mission-control"
            className="p-2 rounded-lg hover:bg-mc-surface transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Manage Mission Control</h1>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Thresholds */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-mc-accent-amber" />
            Thresholds
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Low Inventory Warning (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={localSettings.thresholds.low_inventory_percent}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    thresholds: {
                      ...localSettings.thresholds,
                      low_inventory_percent: parseInt(e.target.value)
                    }
                  })}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-mc-accent-cyan min-w-[3ch]">
                  {localSettings.thresholds.low_inventory_percent}%
                </span>
              </div>
              <p className="text-xs text-mc-text-muted mt-1">
                Warn when inventory falls below this percentage
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Reorder Buffer (days)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={localSettings.thresholds.reorder_days_buffer}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    thresholds: {
                      ...localSettings.thresholds,
                      reorder_days_buffer: parseInt(e.target.value)
                    }
                  })}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-mc-accent-cyan min-w-[3ch]">
                  {localSettings.thresholds.reorder_days_buffer}
                </span>
              </div>
              <p className="text-xs text-mc-text-muted mt-1">
                Days of supply to maintain when reordering
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSaveThresholds}
            className="mc-button mc-button-primary mt-4 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Thresholds
          </button>
        </div>
        
        {/* Inventory Management */}
        <div className="mc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-mc-accent-violet" />
              Inventory Items
            </h2>
            <button
              onClick={handleAddItem}
              className="mc-button mc-button-primary text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          
          <div className="space-y-2">
            {/* New Item Form */}
            {newItem && (
              <div className="p-4 border border-mc-accent-cyan/30 rounded-lg bg-mc-surface">
                <div className="grid grid-cols-6 gap-3">
                  <input
                    type="text"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Item name"
                    className="col-span-2 px-3 py-2 bg-mc-bg-primary border border-mc-border rounded 
                             text-sm focus:outline-none focus:border-mc-accent-cyan"
                    autoFocus
                  />
                  
                  <select
                    value={newItem.category || 'food'}
                    onChange={(e) => setNewItem({ 
                      ...newItem, 
                      category: e.target.value as InventoryCategory 
                    })}
                    className="px-3 py-2 bg-mc-bg-primary border border-mc-border rounded 
                             text-sm focus:outline-none focus:border-mc-accent-cyan"
                  >
                    <option value="food">Food</option>
                    <option value="supplement">Supplement</option>
                    <option value="other">Other</option>
                  </select>
                  
                  <input
                    type="text"
                    value={newItem.unit || ''}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="Unit"
                    className="px-3 py-2 bg-mc-bg-primary border border-mc-border rounded 
                             text-sm focus:outline-none focus:border-mc-accent-cyan"
                  />
                  
                  <input
                    type="number"
                    value={newItem.min_qty || 0}
                    onChange={(e) => setNewItem({ 
                      ...newItem, 
                      min_qty: parseFloat(e.target.value) 
                    })}
                    placeholder="Min qty"
                    className="px-3 py-2 bg-mc-bg-primary border border-mc-border rounded 
                             text-sm focus:outline-none focus:border-mc-accent-cyan"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNewItem}
                      className="mc-button mc-button-primary text-xs px-3 py-2"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setNewItem(null)}
                      className="mc-button mc-button-secondary text-xs px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Existing Items */}
            {inventory.map(item => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  editingItem === item.id 
                    ? "border-mc-accent-cyan bg-mc-surface" 
                    : "border-mc-border hover:bg-mc-surface/50"
                )}
              >
                {editingItem === item.id ? (
                  <div className="grid grid-cols-6 gap-3 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateInventoryItem(item.id, { name: e.target.value })}
                      className="col-span-2 px-2 py-1 bg-mc-bg-primary border border-mc-border rounded text-sm"
                    />
                    
                    <select
                      value={item.category}
                      onChange={(e) => updateInventoryItem(item.id, { 
                        category: e.target.value as InventoryCategory 
                      })}
                      className="px-2 py-1 bg-mc-bg-primary border border-mc-border rounded text-sm"
                    >
                      <option value="food">Food</option>
                      <option value="supplement">Supplement</option>
                      <option value="other">Other</option>
                    </select>
                    
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.min_qty}
                        onChange={(e) => updateInventoryItem(item.id, { 
                          min_qty: parseFloat(e.target.value) 
                        })}
                        className="w-16 px-2 py-1 bg-mc-bg-primary border border-mc-border rounded text-sm"
                      />
                      <span className="text-xs text-mc-text-muted">{item.unit}</span>
                    </div>
                    
                    <input
                      type="url"
                      value={item.reorder_link || ''}
                      onChange={(e) => updateInventoryItem(item.id, { reorder_link: e.target.value })}
                      placeholder="Reorder link"
                      className="px-2 py-1 bg-mc-bg-primary border border-mc-border rounded text-sm"
                    />
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="mc-button mc-button-primary text-xs px-2 py-1"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="grid grid-cols-6 gap-3 items-center cursor-pointer"
                    onClick={() => setEditingItem(item.id)}
                  >
                    <div className="col-span-2">
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    
                    <div>
                      <span className="text-xs px-2 py-0.5 bg-mc-surface rounded">
                        {item.category}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-mc-text-secondary">Min: </span>
                      <span>{item.min_qty} {item.unit}</span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-mc-text-secondary">Current: </span>
                      <span className={cn(
                        item.current_qty <= item.min_qty ? "text-mc-warning" : "text-mc-success"
                      )}>
                        {item.current_qty} {item.unit}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.reorder_link && (
                        <a
                          href={item.reorder_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-mc-accent-cyan hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // In real app, would delete via API
                          useMissionControlStore.getState().setInventory(
                            inventory.filter(i => i.id !== item.id)
                          );
                        }}
                        className="text-mc-danger hover:bg-mc-danger/10 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {inventory.length === 0 && !newItem && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-mc-text-muted opacity-50" />
                <p className="text-sm text-mc-text-muted">No inventory items configured</p>
                <p className="text-xs text-mc-text-muted mt-1">
                  Start by adding 5 staples (protein, carb, veg, fruit, fats)
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Section Toggles */}
        <div className="mc-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-mc-accent-cyan" />
            Dashboard Sections
          </h2>
          
          <p className="text-sm text-mc-text-secondary mb-4">
            Choose which sections to display on the main dashboard
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries({
              show_supplements: 'Supplements Timeline',
              show_workout: 'Workout Section',
              show_tasks: 'Tasks Section',
              show_calendar: 'Calendar Events',
              show_telemetry: 'Telemetry Panel',
              show_inventory: 'Inventory Warnings'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 p-3 rounded-lg bg-mc-surface hover:bg-mc-surface/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.display[key as keyof typeof localSettings.display]}
                  onChange={(e) => {
                    const newDisplay = {
                      ...localSettings.display,
                      [key]: e.target.checked
                    };
                    setLocalSettings({ ...localSettings, display: newDisplay });
                    updateSettings({ display: newDisplay });
                  }}
                  className="rounded border-mc-border"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}