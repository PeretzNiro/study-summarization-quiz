/**
 * Re-exports the Schema type from the Amplify data model
 * This pattern provides a clean import path for frontend components
 * while maintaining the original schema definition in the Amplify directory
 */
export type { Schema } from '../../amplify/data/resource';