'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Heart, User, Server, Globe, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useAuthStore } from '@/stores/auth.store';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { EnvironmentType } from '@qarevel/shared-types';
import type { Environment } from '@qarevel/shared-types';

const typeOptions = [
  { label: 'Local', value: 'LOCAL' },
  { label: 'Remote', value: 'REMOTE' },
];

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
      {initials}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  // Environment management
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const { data: environments, isLoading: envsLoading, refetch: refetchEnvs } = useApi<Environment[]>(envsFetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [envError, setEnvError] = useState('');
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
    setEnvError('');
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
      refetchEnvs();
    } catch (err: any) {
      setEnvError(err.message || 'Failed to create environment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this environment?')) return;
    try {
      await api.deleteEnvironment(id);
      refetchEnvs();
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
    <AppLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile section with avatar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-5 pb-2">
              <UserInitials name={user?.displayName || user?.email || 'U'} />
              <div>
                <p className="text-lg font-semibold text-foreground">{user?.displayName || '-'}</p>
                <p className="text-sm text-muted-foreground">{user?.email || '-'}</p>
                <Badge variant="secondary" className="mt-1.5 capitalize">{user?.role || 'user'}</Badge>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4 space-y-3">
              <Input label="Display Name" value={user?.displayName || ''} readOnly />
              <Input label="Email" value={user?.email || ''} readOnly />
            </div>
          </CardContent>
        </Card>

        {/* API config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>Backend API connection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API URL"
              value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Set via NEXT_PUBLIC_API_URL environment variable
            </p>
          </CardContent>
        </Card>

        {/* Environments section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Environments</CardTitle>
                </div>
                <CardDescription className="mt-1.5">Manage test environments</CardDescription>
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {envsLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">Loading...</p>
              </div>
            ) : !environments || environments.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Globe className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">No environments configured</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Base URL</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {environments.map((env) => (
                    <TableRow key={env.id}>
                      <TableCell className="font-medium text-foreground">{env.name}</TableCell>
                      <TableCell>
                        <Badge variant={env.type === 'LOCAL' ? 'secondary' : 'default'}>
                          {env.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{env.baseUrl}</TableCell>
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
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200/60 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-red-700 dark:text-red-400">Danger Zone</CardTitle>
            </div>
            <CardDescription>Irreversible actions -- proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Environment">
        <form onSubmit={handleSubmit} className="space-y-4">
          {envError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {envError}
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
