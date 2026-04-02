'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Heart } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { EnvironmentType } from '@qarevel/shared-types';
import type { Environment } from '@qarevel/shared-types';

const typeOptions = [
  { label: 'Local', value: 'LOCAL' },
  { label: 'Remote', value: 'REMOTE' },
];

export default function EnvironmentsPage() {
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const { data: environments, isLoading, refetch } = useApi<Environment[]>(envsFetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: '',
    type: 'LOCAL' as EnvironmentType,
    baseUrl: '',
    description: '',
    healthCheckUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createEnvironment({
        name: form.name,
        type: form.type,
        baseUrl: form.baseUrl,
        description: form.description || undefined,
        healthCheckUrl: form.healthCheckUrl || undefined,
      });
      setDialogOpen(false);
      setForm({ name: '', type: EnvironmentType.LOCAL, baseUrl: '', description: '', healthCheckUrl: '' });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create environment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this environment?')) return;
    try {
      await api.deleteEnvironment(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleHealthCheck = async (id: string) => {
    setHealthChecking(id);
    try {
      const result = await api.checkEnvironment(id);
      setHealthResults((prev) => ({ ...prev, [id]: result.healthy }));
    } catch {
      setHealthResults((prev) => ({ ...prev, [id]: false }));
    } finally {
      setHealthChecking(null);
    }
  };

  return (
    <AppLayout title="Environments">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Manage test environments</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Environment
          </Button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !environments || environments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No environments configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.map((env) => (
                <TableRow key={env.id}>
                  <TableCell className="font-medium">{env.name}</TableCell>
                  <TableCell>
                    <Badge variant={env.type === 'LOCAL' ? 'secondary' : 'default'}>
                      {env.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{env.baseUrl}</TableCell>
                  <TableCell>
                    {healthResults[env.id] !== undefined ? (
                      <StatusDot status={healthResults[env.id] ? 'healthy' : 'error'} />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Health Check"
                        loading={healthChecking === env.id}
                        onClick={() => handleHealthCheck(env.id)}
                      >
                        <Heart className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(env.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Environment">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Name"
            placeholder="Staging, Production, etc."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Type"
            options={typeOptions}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as EnvironmentType })}
          />
          <Input
            label="Base URL"
            placeholder="https://staging.example.com"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Health Check URL"
            placeholder="https://staging.example.com/health"
            value={form.healthCheckUrl}
            onChange={(e) => setForm({ ...form, healthCheckUrl: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </AppLayout>
  );
}
