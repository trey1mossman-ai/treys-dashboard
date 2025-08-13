import { format } from 'date-fns';

interface ExportItem {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  completed: boolean;
  tag?: string;
  notes?: string;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'markdown';
  includeCompleted?: boolean;
  includeNotes?: boolean;
}

export function exportAgenda(items: ExportItem[], options: ExportOptions): string {
  const { format, includeCompleted = true, includeNotes = true } = options;
  
  const filteredItems = includeCompleted 
    ? items 
    : items.filter(item => !item.completed);

  switch (format) {
    case 'json':
      return exportAsJSON(filteredItems);
    case 'csv':
      return exportAsCSV(filteredItems, includeNotes);
    case 'markdown':
      return exportAsMarkdown(filteredItems, includeNotes);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function exportAsJSON(items: ExportItem[]): string {
  return JSON.stringify(items, null, 2);
}

function exportAsCSV(items: ExportItem[], includeNotes: boolean): string {
  const headers = ['Title', 'Start Time', 'End Time', 'Completed', 'Tag'];
  if (includeNotes) headers.push('Notes');
  
  const rows = items.map(item => {
    const row = [
      `"${item.title}"`,
      format(item.startTime, 'HH:mm'),
      format(item.endTime, 'HH:mm'),
      item.completed ? 'Yes' : 'No',
      item.tag || ''
    ];
    if (includeNotes) row.push(`"${item.notes || ''}"`);
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function exportAsMarkdown(items: ExportItem[], includeNotes: boolean): string {
  const date = format(new Date(), 'EEEE, MMMM d, yyyy');
  let markdown = `# Agenda for ${date}\n\n`;
  
  const completed = items.filter(item => item.completed);
  const pending = items.filter(item => !item.completed);
  
  if (pending.length > 0) {
    markdown += '## Pending Items\n\n';
    pending.forEach(item => {
      markdown += `- [ ] **${format(item.startTime, 'HH:mm')} - ${format(item.endTime, 'HH:mm')}**: ${item.title}`;
      if (item.tag) markdown += ` [${item.tag}]`;
      markdown += '\n';
      if (includeNotes && item.notes) {
        markdown += `  > ${item.notes}\n`;
      }
    });
    markdown += '\n';
  }
  
  if (completed.length > 0) {
    markdown += '## Completed Items\n\n';
    completed.forEach(item => {
      markdown += `- [x] ~~${format(item.startTime, 'HH:mm')} - ${format(item.endTime, 'HH:mm')}: ${item.title}~~`;
      if (item.tag) markdown += ` [${item.tag}]`;
      markdown += '\n';
      if (includeNotes && item.notes) {
        markdown += `  > ${item.notes}\n`;
      }
    });
  }
  
  return markdown;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF() {
  // Add print-specific styles
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      .no-print { display: none !important; }
      body { 
        font-size: 12pt;
        background: white !important;
        color: black !important;
      }
      .print-break { page-break-after: always; }
      * {
        box-shadow: none !important;
        text-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Trigger print dialog
  window.print();
  
  // Clean up
  setTimeout(() => {
    document.head.removeChild(style);
  }, 1000);
}