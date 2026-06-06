import {
    App,
    Setting,
    Notice,
} from "obsidian";

import StorySelector from "./StorySelector";
import { FilePostSaveHandler } from "./fileManagement";
import Note from "./Note";
import NewsModal from "./NewsModal";
import { BaseNote } from "./BaseNote";


/**
 * Modal to create a new note
 */
export class LogModal extends NewsModal {
    private note: Note | null = null
    private storySelector!: StorySelector
    private currentStoryLink: string | null = null
    private logFileStoryLink: string | null = null
    private currentSourceNoteLink: string | null = null
    private logText: string | ""


    constructor(app: App, selectedText: string | null, settings: any = {}) {
        super(app, settings);
        this.logText = selectedText || ""
        this.currentSourceNoteLink = this.getCurrentSourceNoteLinkForLog()
        this.currentStoryLink = this.getCurrentStoryLinkForLog()
        this.setLogFile();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: `Add Log Entry` });

        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Log Content')
            .addTextArea((text) => {
                text
                    .setValue(this.logText)
                    .onChange((value) => {
                        this.logText = value;
                    });
                })

        /* ---------------- Stories ---------------- */
        const onStoriesChange = () => { 
            const selectedStories = this.storySelector?.getSelectedStories() || []
            this.currentStoryLink = selectedStories[0] || null
            return this.currentStoryLink || "";
        }

        this.storySelector = new StorySelector(this.app, onStoriesChange, true)
        this.storySelector.render(contentEl);

        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
            this.currentStoryLink = this.storySelector?.getSelectedStories()?.[0] || this.currentStoryLink
        } else if (this.currentStoryLink) {
            this.storySelector?.addStories([this.currentStoryLink])
        }

        /* ---------------- Create Button ---------------- */
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Add Log Entry")
                    .setCta()
                    .onClick(() => {
                        this.createNote()
                        this.close();
                    })
            );
    }

    //Create the note file based on the metadata entered
      private async createNote() {
        if (!this.currentStoryLink) {
            new Notice("Select a story before adding a log entry.")
            return
        }

        if (this.logFileStoryLink !== this.currentStoryLink) {
            this.note = null
        }
        this.setLogFile();
        if(!this.note) {
            new Notice("Error: Could not create or find log note for selected story.")
            return
        }

        this.note.metadata.story = this.currentStoryLink

        //Append the log entry to the note content
        const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const sourceNoteSuffix = this.currentSourceNoteLink ? `\n${this.currentSourceNoteLink}` : ""
        this.note.contents += `**${dateStr} ${timeStr}**\n${this.logText}${sourceNoteSuffix}\n\n`
        const postSaveHandler = new FilePostSaveHandler(this.app, this.settings, {doClipboard: true, doNotify: true}, );
        this.fileManager.saveFile({path: `Notes/${this.note.title}.md`, noteObj: this.note, postSaveHandler: postSaveHandler})
        navigator.clipboard.writeText(`[[${this.logText}]]`);
     }


    onClose() {
        this.contentEl.empty();
    }
    
    //Set the log file for the current story, creating one if it doesn't exist
    setLogFile() {
        //No log note without a current story or there's already a log note
        if(!this.currentStoryLink || this.note) return
        const storyBasename = this.extractStoryBasename(this.currentStoryLink)
        if(!storyBasename) return
        //Try to get existing log note for this story
        const logFileName = `${storyBasename} - Log`
        const result = this.fileManager.getFile(`Notes/${logFileName}.md`)
        //If found, use it, otherwise create a new one
        if(result.status === "ok"){
            this.note = result.file as Note
            this.note.metadata.story = this.currentStoryLink
            this.logFileStoryLink = this.currentStoryLink
        } else {
            const defaultLogMetadata = {
                title: logFileName,
                category: "Log",
                story: this.currentStoryLink
            }
            this.note = new Note(null, defaultLogMetadata, {})
            this.logFileStoryLink = this.currentStoryLink
            this.fileManager.saveFile({noteObj: this.note, postSaveHandler: new FilePostSaveHandler(this.app, this.settings, {doClipboard: false, doNotify: true}), path: `Notes/${logFileName}.md`})
        }
    }

    private getCurrentStoryLinkForLog(): string | null {
        const currentFile = this.fileManager.getCurrentActiveFileOfType(null) as BaseNote
        if (!currentFile) return null

        if (currentFile.metadata?.type === "Story" && currentFile.tFile?.basename) {
            return `[[${currentFile.tFile.basename}]]`
        }

        if (currentFile.metadata?.type === "Note") {
            const stories = currentFile.metadata?.stories
            if (Array.isArray(stories) && stories.length > 0 && typeof stories[0] === "string") {
                return stories[0]
            }
            if (typeof stories === "string") {
                return stories.split(",")[0]?.trim() || null
            }
        }

        if (typeof currentFile.metadata?.story === "string" && currentFile.metadata.story.trim().length > 0) {
            return currentFile.metadata.story.trim()
        }

        return null
    }

    private getCurrentSourceNoteLinkForLog(): string | null {
        const currentFile = this.fileManager.getCurrentActiveFileOfType(null) as BaseNote
        if (!currentFile) return null

        if (currentFile.metadata?.type === "Note" && currentFile.tFile?.basename) {
            return `[[${currentFile.tFile.basename}]]`
        }

        return null
    }

    private extractStoryBasename(storyLink: string): string | null {
        const trimmedLink = storyLink.trim()
        if (!trimmedLink) return null

        const wikiLinkMatch = trimmedLink.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/)
        const linkTarget = wikiLinkMatch ? wikiLinkMatch[1] : trimmedLink
        const pathParts = linkTarget.split("/").filter(Boolean)
        return pathParts.length > 0 ? pathParts[pathParts.length - 1].trim() : null
    }


}
