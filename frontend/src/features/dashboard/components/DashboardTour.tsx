import { HelpCircle } from 'lucide-react';
import { useDriver } from 'driverjs-react';
import { themeClasses } from '@/theme/themeClasses';

export default function DashboardTour() {
  const { driver, setSteps } = useDriver();

  const launch = () => {
    if (!driver) return;

    setSteps([
      {
        element: '.edit-toggle',
        popover: {
          title: 'Edit layout',
          description: 'Turn editing on or off here.',
        },
      },
      {
        element: '.add-widget',
        popover: {
          title: 'Add widgets',
          description: 'Open the palette to insert a widget.',
        },
      },
      {
        element: '.drag-handle',
        popover: {
          title: 'Move widgets',
          description: 'Grab the header to drag a widget anywhere.',
        },
      },
    ]);

    driver.drive();
    localStorage.setItem('dashTourDone', 'true');
  };

  return (
    <div className="group relative inline-block">
      <button
        onClick={launch}
        className={`help-button ${themeClasses.iconButton} rounded p-2 focus:outline-none`}
        aria-label="Help"
      >
        <HelpCircle className="h-5 w-5 text-[var(--text-primary)]" />
      </button>
      <span className="ui-panel pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
        Help
      </span>
    </div>
  );
}
