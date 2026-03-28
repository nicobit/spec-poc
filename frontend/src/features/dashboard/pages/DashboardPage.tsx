import WidgetManager from '../components/WidgetManager';

export default function DashboardPage() {
  return (
    <div className="grid h-full gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-full h-full">
        <WidgetManager />
      </div>
    </div>
  );
}
