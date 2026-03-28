import { type ReactNode } from 'react';
import { DriverProvider } from 'driverjs-react';
import { SnackbarProvider } from 'notistack';

import { QueryProvider } from '@/features/chat/contexts/QueryContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SnackbarProvider maxSnack={3}>
        <DriverProvider>
          <ThemeProvider>
            <SidebarProvider>
              <QueryProvider>{children}</QueryProvider>
            </SidebarProvider>
          </ThemeProvider>
        </DriverProvider>
      </SnackbarProvider>
    </AuthProvider>
  );
}
