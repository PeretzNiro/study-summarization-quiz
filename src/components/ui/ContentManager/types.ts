/**
 * Represents a message displayed to users after a system action
 * Used for notifications, alerts, and user feedback
 */
export interface ActionMessage {
  text: string;                        // Content of the message to display
  type: 'success' | 'error' | 'info';  // Controls the styling and icon shown
}