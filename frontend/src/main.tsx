import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

import App from './App';
import { AppProviders } from './app/providers';
import './index.css'; // TailwindCSS 
import './styles/rgl-placeholder.css'
import 'driver.js/dist/driver.css';     // spotlight / tooltip styles
import './i18n'; // i18n setup

const msalInstance = new PublicClientApplication(msalConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <AppProviders>
        <App />
      </AppProviders>
    </MsalProvider>
  </React.StrictMode>
);
