'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { TestSuite } from '@qarevel/shared-types';

export default function TestSuitesPage() {
  const suitesFetcher = useCallback(() => api.getTestSuites(), []);
  const { data: suites, isLoading, refetch } = useApi<TestSuite[]>(suitesFetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', tags: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createTestSuite({
        name: form.name,
        description: form.description || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      });
      setDialogOpen(false);
      setForm({ name: '', description: '', tags: '' });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create test suite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Test Suites">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Organize test cases into suites</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Suite
          </Button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !suites || suites.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No test suites yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suites.map((suite) => (
                <TableRow key={suite.id}>
                  <TableCell className="font-medium">
                    <Link href={`/tests/suites/${suite.id}`} className="text-primary hover:underline">
                      {suite.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {suite.description || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{suite.cases?.length ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {suite.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(suite.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Test Suite">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Name"
            placeholder="Smoke Tests, Regression Suite, etc."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Tags"
            placeholder="smoke, login, checkout (comma separated)"
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
