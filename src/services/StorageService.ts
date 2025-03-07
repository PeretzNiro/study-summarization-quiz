import { getUrl, list, remove } from 'aws-amplify/storage';

export interface StorageItem {
  key: string;
  size: number;
  eTag: string;
  lastModified: Date;
  folder?: boolean;
}

export class StorageService {
  // Remove the ROOT_FOLDER constant - we'll use direct folder names
  private static readonly ACCESS_LEVEL = 'protected';
  
  /**
   * Lists all folders in storage
   * @returns Array of folder names
   */
  static async listFolders(): Promise<string[]> {
    try {
      const result = await list({
        // No prefix needed anymore
        options: {
          accessLevel: this.ACCESS_LEVEL,
          listAll: true
        }
      });
      
      // Filter for folders (items that end with /)
      const folders = new Set<string>();
      
      result.items.forEach(item => {
        // Extract folder name from path
        const path = item.key;
        if (path.endsWith('/')) {
          // Just remove the trailing slash
          const folderName = path.slice(0, -1);
          if (folderName) { // Don't add the empty string
            folders.add(folderName);
          }
        } else {
          // Get parent folder
          const pathParts = path.split('/');
          if (pathParts.length > 1) {
            // Add all parent folders
            const folderPath = pathParts.slice(0, -1).join('/');
            if (folderPath) { // Don't add the empty string
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
   * @returns Array of file names
   */
  static async listFilesInFolder(folderPath: string): Promise<string[]> {
    try {
      // Ensure folder path ends with /
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      const result = await list({
        prefix: normalizedPath,
        options: {
          accessLevel: this.ACCESS_LEVEL,
          listAll: true
        }
      });
      
      // Extract file names without the folder prefix
      const files = result.items
        .filter(item => !item.key.endsWith('/')) // Filter out subfolders
        .map(item => {
          const keyParts = item.key.split('/');
          return keyParts[keyParts.length - 1]; // Get just the filename
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
      // Ensure folder path ends with /
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      const filePath = `${normalizedPath}${fileName}`;
      
      // Try to get URL which will throw if file doesn't exist
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