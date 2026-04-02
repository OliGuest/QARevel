'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { DevicePlatform, TestPriority, TestType } from '@qarevel/shared-types';
import type { TestCase } from '@qarevel/shared-types';

const platformOptions = [
  { label: 'All Platforms', value: '' },
  { label: 'Android', value: 'ANDROID' },
  { label: 'Windows', value: 'WINDOWS' },
  { label: 'Browser', value: 'BROWSER' },
];

const priorityOptions = [
  { label: 'All Priorities', value: '' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Automated', value: 'AUTOMATED' },
  { label: 'Hybrid', value: 'HYBRID' },
];

const createPlatformOptions = platformOptions.filter((o) => o.value !== '');
const createTypeOptions = typeOptions.filter((o) => o.value !== '');
const createPriorityOptions = priorityOptions.filter((o) => o.value !== '');

function priorityBadgeVariant(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'destructive' as const;
    case 'HIGH': return 'warning' as const;
    case 'MEDIUM': return 'default' as const;
    case 'LOW': return 'secondary' as const;
    default: return 'secondary' as const;
  }
}

function typeBadgeVariant(type: string) {
  switch (type) {
    case 'AUTOMATED': return 'default' as const;
    case 'MANUAL': return 'secondary' as const;
    case 'HYBRID': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

export default function TestCasesPage() {
  const [filters, setFilters] = useState({ platform: '', type: '', priority: '', search: '' });
  const testsFetcher = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.platform) params.platform = filters.platform;
    if (filters.type) params.type = filters.type;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    return api.getTestCases(Object.keys(params).length > 0 ? params : undefined);
  }, [filters]);
  const { data: tests, isLoading, refetch } = useApi<TestCase[]>(testsFetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    platform: 'BROWSER' as DevicePlatform,
    priority: 'MEDIUM' as TestPriority,
    type: 'MANUAL' as TestType,
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createTestCase({
        title: form.title,
        description: form.description || undefined,
        platform: form.platform,
        priority: form.priority,
        type: form.type,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : undefined,
      });
      setDialogOpen(false);
      setForm({ title: '', description: '', platform: DevicePlatform.BROWSER, priority: TestPriority.MEDIUM, type: TestType.MANUAL, tags: '' });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create test case');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await api.deleteTestCase(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <AppLayout title="Test Cases">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Manage test cases and steps</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Test Case
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="h-9 w-full rounded-[var(--radius)] border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="h-9 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
          >
            {platformOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="h-9 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
          >
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="h-9 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
          >
            {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !tests || tests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No test cases found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((tc) => (
                <TableRow key={tc.id}>
                  <TableCell className="font-medium max-w-xs truncate">{tc.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tc.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityBadgeVariant(tc.priority)}>{tc.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(tc.type)}>{tc.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tc.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {tc.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{tc.tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tc.steps?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/tests/${tc.id}`}>
                        <Button variant="ghost" size="sm" title="View/Edit">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(tc.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Test Case">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Title"
            placeholder="Login flow - happy path"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Platform"
            options={createPlatformOptions}
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value as DevicePlatform })}
          />
          <Select
            label="Priority"
            options={createPriorityOptions}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TestPriority })}
          />
          <Select
            label="Type"
            options={createTypeOptions}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TestType })}
          />
          <Input
            label="Tags"
            placeholder="login, smoke, regression (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
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
