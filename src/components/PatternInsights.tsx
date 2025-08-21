import { useState, useEffect } from 'react';
import { patternDetector } from '@/lib/intelligence/pattern-detector';
import { Brain, TrendingUp, Clock, Zap, Target, ChevronRight } from 'lucide-react';

interface Insight {
  id: string;
  text: string;
  confidence: number;
  category: 'productivity' | 'health' | 'routine' | 'suggestion';
  icon: React.ReactNode;
}

interface NextActivity {
  activity: string;
  confidence: number;
  reason: string;
  suggestedTime: string;
}

export function PatternInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [nextActivity, setNextActivity] = useState<NextActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    loadInsights();
    const interval = setInterval(loadInsights, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);
  
  const loadInsights = async () => {
    setIsLoading(true);
    try {
      // Get insights from pattern detector
      const rawInsights = await patternDetector.getInsights();
      
      // Transform insights with metadata
      const formattedInsights: Insight[] = rawInsights.map((text, index) => {
        let category: Insight['category'] = 'suggestion';
        let icon = <Brain className="w-4 h-4" />;
        
        if (text.toLowerCase().includes('productive') || text.toLowerCase().includes('focus')) {
          category = 'productivity';
          icon = <Target className="w-4 h-4" />;
        } else if (text.toLowerCase().includes('energy') || text.toLowerCase().includes('break')) {
          category = 'health';
          icon = <Zap className="w-4 h-4" />;
        } else if (text.toLowerCase().includes('usually') || text.toLowerCase().includes('pattern')) {
          category = 'routine';
          icon = <Clock className="w-4 h-4" />;
        }
        
        return {
          id: `insight-${index}`,
          text,
          confidence: 0.75 + Math.random() * 0.25, // Mock confidence for now
          category,
          icon
        };
      });
      
      setInsights(formattedInsights);
      
      // Get next activity prediction
      const prediction = await patternDetector.predictNext();
      if (prediction) {
        setNextActivity({
          activity: prediction.activity,
          confidence: prediction.confidence,
          reason: prediction.reason || 'Based on your usual patterns',
          suggestedTime: 'Soon'
        });
      }
    } catch (error) {
      console.error('Failed to load pattern insights:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getCategoryColor = (category: Insight['category']) => {
    switch(category) {
      case 'productivity': return 'text-blue-500';
      case 'health': return 'text-green-500';
      case 'routine': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-4 bg-card rounded-lg animate-pulse">
        <div className="h-6 bg-muted rounded w-32 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">AI Insights</h3>
            {insights.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {insights.length} new
              </span>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        
        {!isExpanded && nextActivity && (
          <div className="mt-3 p-2 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Next: {nextActivity.activity}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(nextActivity.confidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {nextActivity && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-medium">Predicted Next Activity</span>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {Math.round(nextActivity.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm font-medium mb-1">{nextActivity.activity}</p>
              <p className="text-xs text-muted-foreground">{nextActivity.reason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Suggested time: {nextActivity.suggestedTime}
              </p>
            </div>
          )}
          
          {insights.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Patterns</h4>
              {insights.map(insight => (
                <div 
                  key={insight.id}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={getCategoryColor(insight.category)}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{insight.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">
                          {insight.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          •
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No patterns detected yet</p>
              <p className="text-xs mt-1">Keep using the app to build insights</p>
            </div>
          )}
          
          <div className="pt-3 border-t">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadInsights();
              }}
              className="text-xs text-primary hover:underline"
            >
              Refresh insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
}