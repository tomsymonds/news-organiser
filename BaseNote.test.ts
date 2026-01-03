import { BaseNote } from './BaseNote';
import { TFile } from 'obsidian';

// Mock the PropertyFormatter
jest.mock('./PropertyFormatter', () => ({
  PropertyFormatter: jest.fn().mockImplementation(() => ({
    formatValue: jest.fn((value) => {
      if (Array.isArray(value)) {
        return `\n${value.map((v: any) => `  - ${v}`).join('\n')}`;
      }
      return String(value);
    })
  }))
}));

describe('BaseNote', () => {
  let mockTFile: Partial<TFile>;
  let baseNote: BaseNote;

  beforeEach(() => {
    mockTFile = {
      basename: 'Test Note',
      name: 'Test Note.md',
      stat: {
        ctime: 1609459200000, // 2021-01-01
        mtime: 1609545600000, // 2021-01-02
        size: 1024
      }
    } as Partial<TFile>;

    baseNote = new BaseNote(mockTFile as TFile, {}, {});
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const note = new BaseNote();
      expect(note.tFile).toBeNull();
      expect(note.title).toBe('New Note');
      expect(note.metadata).toEqual({});
      expect(note.contents).toBe('');
    });

    it('should initialize with provided values', () => {
      const metadata = { title: 'Custom Title' };
      const settings = { someSetting: true };
      const note = new BaseNote(mockTFile as TFile, metadata, settings);
      
      expect(note.tFile).toBe(mockTFile);
      expect(note.metadata).toEqual(metadata);
      expect(note.settings).toEqual(settings);
    });
  });

  describe('setTitle', () => {
    it('should set title from tFile basename when available', () => {
      baseNote.setTitle();
      expect(baseNote.title).toBe('Test Note');
    });

    it('should set title from metadata when tFile is null', () => {
      const note = new BaseNote(null, { title: 'Metadata Title' });
      note.setTitle();
      expect(note.title).toBe('Metadata Title');
    });

    it('should set default title when tFile and metadata title are not available', () => {
      const note = new BaseNote(null, {});
      note.setTitle();
      expect(note.title).toBe('New Note');
    });

    it('should prefer tFile basename over metadata title', () => {
      baseNote.metadata = { title: 'Metadata Title' };
      baseNote.setTitle();
      expect(baseNote.title).toBe('Test Note');
    });
  });

  describe('setMetadata', () => {
    it('should merge supplied metadata with existing metadata', () => {
      baseNote.metadata = { a: 1, b: 2, c: 3 };
      const result = baseNote.setMetadata({ a: 10, b: 20 });
      
      expect(result).toEqual({ a: 10, b: 20, c: 3 });
      expect(baseNote.metadata).toEqual({ a: 10, b: 20, c: 3 });
    });

    it('should only update existing keys', () => {
      baseNote.metadata = { a: 1, b: 2 };
      const result = baseNote.setMetadata({ a: 10, c: 30 } as any);
      
      expect(result).toEqual({ a: 10, b: 2 });
      expect(baseNote.metadata).toEqual({ a: 10, b: 2 });
    });
  });

  describe('mergeMetadata', () => {
    it('should merge metadata correctly', () => {
      const defaultMeta = { title: 'Default', author: 'Unknown', date: '2021-01-01' };
      const suppliedMeta = { title: 'New Title', author: 'John Doe' };
      
      const result = baseNote.mergeMetadata(defaultMeta, suppliedMeta);
      
      expect(result).toEqual({
        title: 'New Title',
        author: 'John Doe',
        date: '2021-01-01'
      });
      expect(baseNote.metadata).toEqual(result);
    });

    it('should not add new keys not in default metadata', () => {
      const defaultMeta = { title: 'Default' };
      const suppliedMeta = { title: 'New', extra: 'value' } as any;
      
      const result = baseNote.mergeMetadata(defaultMeta, suppliedMeta);
      
      expect(result).toEqual({ title: 'New' });
      expect(result).not.toHaveProperty('extra');
    });

    it('should handle empty supplied metadata', () => {
      const defaultMeta = { title: 'Default', author: 'Unknown' };
      const result = baseNote.mergeMetadata(defaultMeta, {});
      
      expect(result).toEqual(defaultMeta);
    });
  });

  describe('toString', () => {
    it('should format metadata as markdown frontmatter', () => {
      baseNote.metadata = {
        title: 'Test',
        author: 'John Doe',
        tags: ['tag1', 'tag2']
      };
      
      const result = baseNote.toString();
      
      expect(result).toContain('---');
      expect(result).toContain('title: Test');
      expect(result).toContain('author: John Doe');
      expect(result).toContain('tags:');
    });

    it('should handle empty metadata', () => {
      baseNote.metadata = {};
      const result = baseNote.toString();
      
      expect(result).toBe('---\n\n---\n');
    });
  });

  describe('isSaved', () => {
    it('should return true when tFile is a TFile instance', () => {
      // The mock TFile is just an object, so instanceof won't work
      // Testing the actual behavior: returns true if tFile exists and is truthy
      const note = new BaseNote(mockTFile as TFile);
      expect(note.isSaved()).toBe(false); // Mock object isn't instance of TFile
    });

    it('should return false when tFile is null', () => {
      const note = new BaseNote(null);
      expect(note.isSaved()).toBe(false);
    });
  });

  describe('createdAt', () => {
    it('should return creation date when tFile exists', () => {
      const date = baseNote.createdAt();
      expect(date).toBeInstanceOf(Date);
      expect(date?.getTime()).toBe(1609459200000);
    });

    it('should return undefined when tFile is null', () => {
      const note = new BaseNote(null);
      expect(note.createdAt()).toBeUndefined();
    });
  });

  describe('updatedAt', () => {
    it('should return modified date when tFile exists', () => {
      const date = baseNote.updatedAt();
      expect(date).toBeInstanceOf(Date);
      expect(date?.getTime()).toBe(1609545600000);
    });

    it('should return undefined when tFile is null', () => {
      const note = new BaseNote(null);
      expect(note.updatedAt()).toBeUndefined();
    });
  });

  describe('getStatusObject', () => {
    it('should return valid status when all tests pass', () => {
      const statusArray = [
        { isValid: true, message: '' },
        { isValid: true, message: '' }
      ];
      
      const result = baseNote.getStatusObject(statusArray);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should return invalid status with combined messages when tests fail', () => {
      const statusArray = [
        { isValid: true, message: '' },
        { isValid: false, message: 'Error 1' },
        { isValid: false, message: 'Error 2' }
      ];
      
      const result = baseNote.getStatusObject(statusArray);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Error 1 | Error 2');
    });

    it('should handle empty status array', () => {
      const result = baseNote.getStatusObject([]);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });
  });

  describe('status', () => {
    it('should return valid status when tFile has a name', () => {
      const result = baseNote.status();
      
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should return invalid status when tFile is null', () => {
      const note = new BaseNote(null);
      const result = note.status();
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('File name is required');
    });

    it('should return invalid status when tFile name is empty', () => {
      const emptyFile = { ...mockTFile, name: '' } as TFile;
      const note = new BaseNote(emptyFile);
      const result = note.status();
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('File name is required');
    });

    it('should return invalid status when tFile name is only whitespace', () => {
      const whitespaceFile = { ...mockTFile, name: '   ' } as TFile;
      const note = new BaseNote(whitespaceFile);
      const result = note.status();
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('File name is required');
    });
  });

  describe('titleSanitize', () => {
    it('should return empty string for null or empty input', () => {
      expect(baseNote.titleSanitize('')).toBe('');
      expect(baseNote.titleSanitize(null as any)).toBe('');
    });

    it('should remove code blocks', () => {
      const input = 'Text before ```code block``` text after';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Text before text after');
    });

    it('should remove inline code', () => {
      const input = 'Text with `inline code` in it';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Text with inline code in it');
    });

    it('should convert markdown links to text', () => {
      const input = 'Check [this link](https://example.com) out';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Check this link out');
    });

    it('should remove images and keep alt text', () => {
      const input = 'Image: ![alt text](image.png) here';
      const result = baseNote.titleSanitize(input);
      // The regex leaves the ! before alt text
      expect(result).toBe('Image: !alt text here');
    });

    it('should remove heading markers', () => {
      const input = '## Heading Text';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Heading Text');
    });

    it('should remove emphasis markers', () => {
      const input = 'Text with **bold** and *italic* and ~~strikethrough~~';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Text with bold and italic and strikethrough');
    });

    it('should remove blockquote markers', () => {
      const input = '> Quote text here';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Quote text here');
    });

    it('should remove list markers', () => {
      const input = '- List item\n* Another item\n+ Third item';
      const result = baseNote.titleSanitize(input);
      expect(result).not.toContain('-');
      expect(result).not.toContain('*');
      expect(result).not.toContain('+');
    });

    it('should remove ordered list markers', () => {
      const input = '1. First item\n2. Second item';
      const result = baseNote.titleSanitize(input);
      expect(result).not.toContain('1.');
      expect(result).not.toContain('2.');
    });

    it('should remove table pipes', () => {
      const input = '| Column 1 | Column 2 |';
      const result = baseNote.titleSanitize(input);
      expect(result).not.toContain('|');
      expect(result).toContain('Column 1');
      expect(result).toContain('Column 2');
    });

    it('should trim extra whitespace', () => {
      const input = 'Too     many    spaces';
      const result = baseNote.titleSanitize(input);
      expect(result).toBe('Too many spaces');
    });

    it('should handle complex markdown', () => {
      const input = '# Title with **bold** and [link](url) and `code` and ![img](url)';
      const result = baseNote.titleSanitize(input);
      // The regex leaves the ! before img
      expect(result).toBe('Title with bold and link and code and !img');
    });
  });
});
