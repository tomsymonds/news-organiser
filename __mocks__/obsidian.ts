// Mock TFile class for testing
export class TFile {
  basename: string;
  name: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
  
  constructor(basename: string = '', name: string = '') {
    this.basename = basename;
    this.name = name;
    this.stat = {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0
    };
  }
}

// Export other Obsidian types as needed
export const mockObsidian = {
  TFile
};
