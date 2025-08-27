import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { Package, AlertTriangle, ShoppingCart, ExternalLink } from 'lucide-react';

export function InventoryWarnings() {
  const { inventory, queueReorder, settings } = useMissionControlStore();
  
  if (!settings.display.show_inventory) {
    return null;
  }
  
  // Calculate low/out items
  const warnings = inventory
    .map(item => {
      const percentRemaining = item.min_qty > 0 
        ? (item.current_qty / item.min_qty) * 100 
        : item.current_qty > 0 ? 100 : 0;
      
      return {
        ...item,
        percentRemaining,
        isOut: item.current_qty === 0,
        isLow: item.current_qty <= item.min_qty && item.current_qty > 0,
        severity: item.current_qty === 0 ? 'critical' as const : 
                  item.current_qty <= item.min_qty ? 'warn' as const : 
                  'ok' as const
      };
    })
    .filter(item => item.severity !== 'ok')
    .sort((a, b) => {
      // Sort by severity (out first, then low), then by percent remaining
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return a.percentRemaining - b.percentRemaining;
    });
  
  const handleReorder = async (itemId: string) => {
    try {
      await queueReorder({
        inventory_item_id: itemId,
        correlation_id: `reorder-${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to queue reorder:', error);
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return '🍽️';
      case 'supplement': return '💊';
      case 'other': return '📦';
      default: return '📦';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="mc-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inventory</h3>
          <div className="flex items-center gap-2">
            {warnings.filter(w => w.isOut).length > 0 && (
              <span className="px-2 py-0.5 bg-mc-danger/20 text-mc-danger text-xs font-medium rounded">
                {warnings.filter(w => w.isOut).length} OUT
              </span>
            )}
            {warnings.filter(w => w.isLow).length > 0 && (
              <span className="px-2 py-0.5 bg-mc-warning/20 text-mc-warning text-xs font-medium rounded">
                {warnings.filter(w => w.isLow).length} LOW
              </span>
            )}
          </div>
        </div>
        
        {warnings.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-3 text-mc-text-muted opacity-50" />
            <p className="text-sm text-mc-text-muted">All inventory levels OK</p>
          </div>
        ) : (
          <div className="space-y-2">
            {warnings.map(item => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  item.isOut 
                    ? "bg-mc-danger/5 border-mc-danger/30" 
                    : "bg-mc-warning/5 border-mc-warning/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">{getCategoryIcon(item.category)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.isOut && (
                        <AlertTriangle className="w-4 h-4 text-mc-danger" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "text-xs",
                        item.isOut ? "text-mc-danger" : "text-mc-warning"
                      )}>
                        {item.isOut 
                          ? "OUT OF STOCK" 
                          : `${item.current_qty} ${item.unit} remaining`}
                      </span>
                      
                      <span className="text-xs text-mc-text-muted">
                        Min: {item.min_qty} {item.unit}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-mc-surface rounded-full overflow-hidden mt-2">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          item.isOut ? "bg-mc-danger" : "bg-mc-warning"
                        )}
                        style={{ width: `${Math.min(item.percentRemaining, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleReorder(item.id)}
                      className="mc-button mc-button-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Reorder
                    </button>
                    
                    {item.reorder_link && (
                      <a
                        href={item.reorder_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-mc-accent-cyan hover:underline flex items-center gap-1 justify-center"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      {inventory.length > 0 && (
        <div className="mc-card p-4">
          <h4 className="text-sm font-medium text-mc-text-secondary mb-3">Inventory Status</h4>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-mc-surface">
              <div className="text-lg font-semibold">{inventory.length}</div>
              <div className="text-xs text-mc-text-muted">Total Items</div>
            </div>
            
            <div className="p-2 rounded bg-mc-danger/10">
              <div className="text-lg font-semibold text-mc-danger">
                {warnings.filter(w => w.isOut).length}
              </div>
              <div className="text-xs text-mc-text-muted">Out</div>
            </div>
            
            <div className="p-2 rounded bg-mc-warning/10">
              <div className="text-lg font-semibold text-mc-warning">
                {warnings.filter(w => w.isLow).length}
              </div>
              <div className="text-xs text-mc-text-muted">Low</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}