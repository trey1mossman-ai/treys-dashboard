import React, { useState } from 'react';
import { Project } from '@/services/lifeOS-db';
import { projectService } from '../services/projectService';

interface ProjectListProps {
  projects: Project[];
  onProjectCreate: (title: string, description?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function ProjectList({ projects, onProjectCreate, onRefresh }: ProjectListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    setCreating(true);
    try {
      await onProjectCreate(newProjectTitle, newProjectDescription);
      setNewProjectTitle('');
      setNewProjectDescription('');
      setShowCreateForm(false);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: Project['priority']) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Projects</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>+</span>
          New Project
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 bg-white/10 rounded-lg p-4">
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Project title"
                className="w-full px-4 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full px-4 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !newProjectTitle.trim()}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectTitle('');
                  setNewProjectDescription('');
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <div className="text-4xl mb-4">📭</div>
            <p>No active projects yet</p>
            <p className="text-sm mt-2">Create your first project to get started</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white/10 rounded-lg p-4 hover:bg-white/15 transition-all cursor-pointer"
              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`} />
                  <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                  <span className="text-2xl">{getPriorityIcon(project.priority)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-white/70">
                    <span className="text-2xl">{project.completionPercent}%</span>
                    <div className="w-32 h-2 bg-white/20 rounded-full mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all"
                        style={{ width: `${project.completionPercent}%` }}
                      />
                    </div>
                  </div>
                  {project.revenue && (
                    <div className="text-green-400 font-semibold">
                      ${project.revenue.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {expandedProject === project.id && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  {project.description && (
                    <p className="text-white/70 mb-3">{project.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/50">Status:</span>
                      <span className="ml-2 text-white">{project.status}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Priority:</span>
                      <span className="ml-2 text-white">{project.priority}</span>
                    </div>
                    {project.cost && (
                      <div>
                        <span className="text-white/50">Cost:</span>
                        <span className="ml-2 text-white">${project.cost.toLocaleString()}</span>
                      </div>
                    )}
                    {project.tags && project.tags.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-white/50">Tags:</span>
                        <div className="flex gap-2 mt-1">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-white/20 rounded-full text-xs text-white"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const stats = await projectService.getProjectWithStats(project.id);
                        console.log('Project stats:', stats);
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                    >
                      View Tasks
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await projectService.updateProject(project.id, {
                          status: project.status === 'active' ? 'paused' : 'active'
                        });
                        await onRefresh();
                      }}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded transition-colors"
                    >
                      {project.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-white/10 rounded-lg">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>Email Scanner: Active</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Scanning every 3 hours
          </span>
        </div>
      </div>
    </div>
  );
}