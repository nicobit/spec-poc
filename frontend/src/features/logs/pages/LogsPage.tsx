import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';

const logs = [
  { id: 1, message: 'New deployment on Production', timestamp: '5 min ago' },
  { id: 2, message: 'User JohnDoe updated credentials', timestamp: '20 min ago' },
  { id: 3, message: 'Pre-Production database backup completed', timestamp: '1 hour ago' },
];

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Review recent operational events and administrative activity across the portal."
      />
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardHeader>
              <CardTitle>{log.message}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)]">Time: {log.timestamp}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
