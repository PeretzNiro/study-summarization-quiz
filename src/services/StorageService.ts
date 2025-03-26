import { getUrl, list, remove } from 'aws-amplify/storage';

/**
 * Represents an item in S3 storage
 */
export interface StorageItem {
  key: string;                // Full path to the item in S3
  size: number;               // Size in bytes
  eTag: string;               // Entity tag for object version identification
  lastModified: Date;         // Last modification timestamp
  folder?: boolean;           // Whether the item is a folder
}

/**
 * Service for interacting with AWS S3 storage via Amplify
 */
export class StorageService {
  private static readonly ACCESS_LEVEL = 'protected';
  
  /**
   * Lists all folders in storage
   * @returns Array of folder names
   */
  static async listFolders(): Promise<string[]> {
    try {
      const result = await list({
        options: {
          accessLevel: this.ACCESS_LEVEL,
          listAll: true
        }
      });
      
      // Extract unique folder paths from the results
      const folders = new Set<string>();
      
      result.items.forEach(item => {
        // Folder items end with a trailing slash
        const path = item.key;
        if (path.endsWith('/')) {
          // Remove the trailing slash
          const folderName = path.slice(0, -1);
          if (folderName) {
            folders.add(folderName);
          }
        } else {
          // For files, extract all parent folder paths
          const pathParts = path.split('/');
          if (pathParts.length > 1) {
            const folderPath = pathParts.slice(0, -1).join('/');
            if (folderPath) {
              folders.add(folderPath);
            }
          }
        }
      });
      
      return Array.from(folders);
    } catch (error) {
      console.error('Error listing folders:', error);
      return [];
    }
  }
  
  /**
   * Lists all files in a specific folder
   * @param folderPath Folder path without trailing slash
   * @returns Array of file names (without folder path)
   */
  static async listFilesInFolder(folderPath: string): Promise<string[]> {
    try {
      // Ensure folder path ends with / for proper prefix filtering
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      const result = await list({
        prefix: normalizedPath,
        options: {
          accessLevel: this.ACCESS_LEVEL,
          listAll: true
        }
      });
      
      // Extract only file names without the folder prefix
      const files = result.items
        .filter(item => !item.key.endsWith('/')) // Exclude subfolders
        .map(item => {
          const keyParts = item.key.split('/');
          return keyParts[keyParts.length - 1]; // Return only the filename
        });
      
      return files;
    } catch (error) {
      console.error(`Error listing files in folder ${folderPath}:`, error);
      return [];
    }
  }
  
  /**
   * Check if a file exists in a folder
   * @param folderPath Folder path
   * @param fileName File name
   * @returns True if file exists
   */
  static async checkFileExists(folderPath: string, fileName: string): Promise<boolean> {
    try {
      // Construct full file path with normalized folder path
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      const filePath = `${normalizedPath}${fileName}`;
      
      // getUrl with validateObjectExistence will throw if the file doesn't exist
      await getUrl({
        key: filePath,
        options: {
          accessLevel: this.ACCESS_LEVEL,
          validateObjectExistence: true
        }
      });
      
      return true;
    } catch (error) {
      // File doesn't exist or other error
      return false;
    }
  }
  
  /**
   * Delete a file from storage
   * @param filePath Full path to file
   * @returns True if successful
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      await remove({ 
        key: filePath,
        options: {
          accessLevel: this.ACCESS_LEVEL
        }
      });
      return true;
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }
}