'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { DevicePlatform } from '@qarevel/shared-types';
import type { AppTarget } from '@qarevel/shared-types';

const platformOptions = [
  { label: 'Android', value: 'ANDROID' },
  { label: 'Windows', value: 'WINDOWS' },
  { label: 'Browser', value: 'BROWSER' },
];

export default function TargetsPage() {
  const targetsFetcher = useCallback(() => api.getAppTargets(), []);
  const { data: targets, isLoading, refetch } = useApi<AppTarget[]>(targetsFetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    platform: 'BROWSER' as DevicePlatform,
    packageName: '',
    executablePath: '',
    urlPattern: '',
    version: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createAppTarget({
        name: form.name,
        platform: form.platform,
        packageName: form.packageName || undefined,
        executablePath: form.executablePath || undefined,
        urlPattern: form.urlPattern || undefined,
        version: form.version || undefined,
      });
      setDialogOpen(false);
      setForm({ name: '', platform: DevicePlatform.BROWSER, packageName: '', executablePath: '', urlPattern: '', version: '' });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create app target');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this app target?')) return;
    try {
      await api.deleteAppTarget(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const getIdentifier = (target: AppTarget): string => {
    return target.packageName || target.urlPattern || target.executablePath || '-';
  };

  return (
    <AppLayout title="App Targets">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Applications under test</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create App Target
          </Button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !targets || targets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No app targets yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Package / URL / Path</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium">{target.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{target.platform}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-sm text-muted-foreground">
                    {getIdentifier(target)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{target.version || '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(target.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create App Target">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Name"
            placeholder="My App"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Platform"
            options={platformOptions}
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value as DevicePlatform })}
          />
          <Input
            label="Package Name"
            placeholder="com.example.app (Android)"
            value={form.packageName}
            onChange={(e) => setForm({ ...form, packageName: e.target.value })}
          />
          <Input
            label="URL Pattern"
            placeholder="https://app.example.com/* (Browser)"
            value={form.urlPattern}
            onChange={(e) => setForm({ ...form, urlPattern: e.target.value })}
          />
          <Input
            label="Executable Path"
            placeholder="C:\\Program Files\\App\\app.exe (Windows)"
            value={form.executablePath}
            onChange={(e) => setForm({ ...form, executablePath: e.target.value })}
          />
          <Input
            label="Version"
            placeholder="1.0.0"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
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
