import { ItemView, WorkspaceLeaf } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';

export const SCRIPT_VIEW = 'script-view';

export class ScriptView extends ItemView {
  private editor: EditorView;
  
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return SCRIPT_VIEW;
  }

  getDisplayText() {
    return 'Script view';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.createEl('h4', { text: 'Script view' });
    
    // Create container for the editor
    const editorContainer = container.createDiv({ cls: 'script-editor-container' });
    
    // Initialize CodeMirror 6 editor using Obsidian's built-in CodeMirror
    const startState = EditorState.create({
      doc: '',
      extensions: [
        markdown(),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px'
          },
          '.cm-scroller': {
            overflow: 'auto',
            minHeight: '400px'
          },
          '.cm-content': {
            fontFamily: 'var(--font-monospace)',
            padding: '10px 0'
          }
        })
      ]
    });
    
    this.editor = new EditorView({
      state: startState,
      parent: editorContainer
    });
  }

  async onClose() {
    // Clean up the editor
    if (this.editor) {
      this.editor.destroy();
    }
  }

  // Get the editor content
  getEditorContent(): string {
    return this.editor.state.doc.toString();
  }

  // Set the editor content
  setEditorContent(content: string): void {
    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: content
      }
    });
  }

  // Get the CodeMirror EditorView instance
  getEditor(): EditorView {
    return this.editor;
  }
}