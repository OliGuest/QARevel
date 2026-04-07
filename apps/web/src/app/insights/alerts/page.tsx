'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';

interface AlertRule {
  id: string;
  name: string;
  conditionType: 'test_failure_streak' | 'error_rate_threshold' | 'environment_down' | 'flaky_detected';
  threshold: number;
  testCaseId?: string;
  environmentId?: string;
  enabled: boolean;
  createdAt: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCondition, setFormCondition] = useState<AlertRule['conditionType']>('test_failure_streak');
  const [formThreshold, setFormThreshold] = useState(3);

  const testCasesFetcher = useCallback(() => api.getTestCases(), []);
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const { data: testCases } = useApi<any[]>(testCasesFetcher);
  const { data: environments } = useApi<any[]>(envsFetcher);

  // For now, store rules in localStorage since backend alert rules aren't implemented yet
  useEffect(() => {
    const stored = localStorage.getItem('qarevel_alert_rules');
    if (stored) setRules(JSON.parse(stored));
  }, []);

  const saveRules = (updated: AlertRule[]) => {
    setRules(updated);
    localStorage.setItem('qarevel_alert_rules', JSON.stringify(updated));
  };

  const handleCreate = () => {
    if (!formName) return;
    const newRule: AlertRule = {
      id: crypto.randomUUID(),
      name: formName,
      conditionType: formCondition,
      threshold: formThreshold,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveRules([...rules, newRule]);
    setShowCreate(false);
    setFormName('');
  };

  const toggleRule = (id: string) => {
    saveRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  const conditionLabels: Record<string, string> = {
    test_failure_streak: 'Test fails X times in a row',
    error_rate_threshold: 'Error rate exceeds X%',
    environment_down: 'Environment health check fails',
    flaky_detected: 'Flaky test detected (>20% failure rate)',
  };

  return (
    <AppLayout title="Alert Rules">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alert Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">Get notified when tests fail, environments go down, or flaky tests are detected</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          {showCreate ? 'Cancel' : 'New Rule'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Login test alert" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <Select value={formCondition} onChange={(e) => setFormCondition(e.target.value as AlertRule['conditionType'])}>
                  {Object.entries(conditionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Threshold</label>
                <Input type="number" value={formThreshold} onChange={(e) => setFormThreshold(parseInt(e.target.value) || 1)} min={1} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!formName}>Create Rule</Button>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No alert rules configured. Create one to get notified about test failures.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${rule.enabled ? 'bg-emerald-500/10' : 'bg-gray-500/10'}`}>
                      <Bell className={`h-4 w-4 ${rule.enabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{conditionLabels[rule.conditionType]} (threshold: {rule.threshold})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.enabled ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleRule(rule.id)}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </AppLayout>
  );
}
