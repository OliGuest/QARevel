'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { getRelativeTime } from '@/lib/utils';
import { DevicePlatform } from '@qarevel/shared-types';
import type { Device } from '@qarevel/shared-types';

const platformOptions = [
  { label: 'Android', value: 'ANDROID' },
  { label: 'Windows', value: 'WINDOWS' },
  { label: 'Browser', value: 'BROWSER' },
];

function platformBadgeVariant(platform: string) {
  switch (platform) {
    case 'ANDROID': return 'success' as const;
    case 'WINDOWS': return 'default' as const;
    case 'BROWSER': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

export default function DevicesPage() {
  const devicesFetcher = useCallback(() => api.getDevices(), []);
  const { data: devices, isLoading, refetch } = useApi<Device[]>(devicesFetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    platform: 'ANDROID' as DevicePlatform,
    serialNumber: '',
    ipAddress: '',
    model: '',
    osVersion: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    platform: 'ANDROID' as DevicePlatform,
    serialNumber: '',
    ipAddress: '',
    model: '',
    osVersion: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.registerDevice({
        name: form.name,
        platform: form.platform,
        serialNumber: form.serialNumber || undefined,
        ipAddress: form.ipAddress || undefined,
        model: form.model || undefined,
        osVersion: form.osVersion || undefined,
      });
      setDialogOpen(false);
      setForm({ name: '', platform: DevicePlatform.ANDROID, serialNumber: '', ipAddress: '', model: '', osVersion: '' });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to register device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (device: Device) => {
    setEditingDevice(device);
    setEditForm({
      name: device.name,
      platform: device.platform as DevicePlatform,
      serialNumber: device.serialNumber || '',
      ipAddress: device.ipAddress || '',
      model: device.model || '',
      osVersion: device.osVersion || '',
    });
    setError('');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setError('');
    setSubmitting(true);
    try {
      await api.updateDevice(editingDevice.id, {
        name: editForm.name,
        platform: editForm.platform,
        serialNumber: editForm.serialNumber || undefined,
        ipAddress: editForm.ipAddress || undefined,
        model: editForm.model || undefined,
        osVersion: editForm.osVersion || undefined,
      });
      setEditDialogOpen(false);
      setEditingDevice(null);
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to update device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await api.deleteDevice(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  return (
    <AppLayout title="Devices">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Manage registered test devices
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Register Device
          </Button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading devices...</p>
        ) : !devices || devices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No devices registered yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>
                    <Badge variant={platformBadgeVariant(device.platform)}>{device.platform}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{device.model || '-'}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{device.ipAddress || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusDot status={device.status} />
                      <span className="text-sm">{device.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {device.lastHeartbeat ? getRelativeTime(device.lastHeartbeat) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEditOpen(device)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(device.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Register Device">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Name"
            placeholder="My Test Device"
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
            label="Serial Number"
            placeholder="Optional"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
          <Input
            label="IP Address"
            placeholder="192.168.1.100"
            value={form.ipAddress}
            onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
          />
          <Input
            label="Model"
            placeholder="Pixel 7, Surface Pro, etc."
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <Input
            label="OS Version"
            placeholder="Android 14, Windows 11, etc."
            value={form.osVersion}
            onChange={(e) => setForm({ ...form, osVersion: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Register
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Edit Device">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            label="Name"
            placeholder="My Test Device"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Select
            label="Platform"
            options={platformOptions}
            value={editForm.platform}
            onChange={(e) => setEditForm({ ...editForm, platform: e.target.value as DevicePlatform })}
          />
          <Input
            label="Serial Number"
            placeholder="Optional"
            value={editForm.serialNumber}
            onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
          />
          <Input
            label="IP Address"
            placeholder="192.168.1.100"
            value={editForm.ipAddress}
            onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
          />
          <Input
            label="Model"
            placeholder="Pixel 7, Surface Pro, etc."
            value={editForm.model}
            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
          />
          <Input
            label="OS Version"
            placeholder="Android 14, Windows 11, etc."
            value={editForm.osVersion}
            onChange={(e) => setEditForm({ ...editForm, osVersion: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </AppLayout>
  );
}
