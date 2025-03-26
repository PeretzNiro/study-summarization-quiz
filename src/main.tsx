import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from '@aws-amplify/ui-react';
import App from "./App.tsx";
import "./index.css";
import "./App.css"
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import '@aws-amplify/ui-react/styles.css';

// Configure AWS Amplify with settings from deployment outputs
// This connects the app to backend services (Auth, API, Storage)
Amplify.configure(outputs);

// Initialize the React application and render it to the DOM
ReactDOM.createRoot(document.getElementById("root")!).render(
  // Enable React's strict mode for additional development-time checks
  <React.StrictMode>
    {/* Wrap the application in Authenticator.Provider to enable authentication throughout the app */}
    <Authenticator.Provider>
      <App />
    </Authenticator.Provider>
  </React.StrictMode>
);
