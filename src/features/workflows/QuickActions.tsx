import { Zap, Coffee, Calendar, Mail, Github, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/Card'

export function QuickActions() {
  const actions = [
    {
      id: 'coffee',
      label: 'Order Coffee',
      icon: Coffee,
      action: () => console.log('Ordering coffee...')
    },
    {
      id: 'calendar',
      label: 'Schedule Meeting',
      icon: Calendar,
      action: () => console.log('Opening calendar...')
    },
    {
      id: 'email',
      label: 'Check Email',
      icon: Mail,
      action: () => window.open('https://gmail.com', '_blank')
    },
    {
      id: 'github',
      label: 'Open GitHub',
      icon: Github,
      action: () => window.open('https://github.com', '_blank')
    },
    {
      id: 'notes',
      label: 'Quick Note',
      icon: FileText,
      action: () => console.log('Opening notes...')
    }
  ]
  
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map(action => (
          <Button
            key={action.id}
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={action.action}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  )
}