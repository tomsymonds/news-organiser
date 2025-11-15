import { App, TFile, Notice } from "obsidian";
import { FileManager } from "obsidian"

export class ModalUtils {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Opens a note file in a new tab and focuses on it
     */
    async openNote(file: TFile): Promise<void> {
        try {
            // Open the file in a new leaf (tab)
            const leaf = this.app.workspace.getUnpinnedLeaf();
            await leaf.openFile(file);
            
            // Focus on the new leaf
            this.app.workspace.setActiveLeaf(leaf);
        } catch (error) {
            console.error("Failed to open note:", error);
            new Notice("Note created but failed to open");
        }
    }

    /**
     * Opens a note and optionally inserts a link to it in the current document
     */
    async openNoteWithInsert(file: TFile, insertIntoCurrent: boolean = false): Promise<void> {
        await this.openNote(file);

        if (insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
            const editor = this.app.workspace.activeEditor.editor;
            editor.replaceSelection(`[[${file.basename}]]`);
        }
    }

    /**
     * Standard save callback that opens the note on successful creation
     * Pass an additionalCallback function that is also called
     */
    createSaveCallback(additionalCallback?: (result: any) => void) {
        return (result: any) => {
            // Call additional callback if provided
            if (additionalCallback) {
                additionalCallback(result);
            }
            // Open the note if creation was successful
            if (result.status === "ok" && result.file && result.file.tFile) {
                this.openNote(result.file.tFile);
            }
        };
    }

}