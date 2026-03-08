import {
    App,
    Modal,
    Setting,
    TFile,
    Notice,
} from "obsidian";

import StorySelector from "./StorySelector";
import CategorySelector from "./CategorySelector";
import { FilePostSaveHandler } from "./fileManagement";
import Note from "./Note";
import NewsModal from "./NewsModal";
import { BaseNote } from "./BaseNote";


/**
 * Modal to create a new note
 */
export class LogModal extends NewsModal {
    private note: Note | null = null
    private insertIntoCurrent = false;
    private components: string[] = []
    private type: string
    private storySelector!: StorySelector
    private currentStory: BaseNote | undefined
    private logText: string | ""


    constructor(app: App, selectedText: string | null, settings: any = {}) {
        super(app, settings);
        //this.components = components;
        this.type = "Note"
        this.logText = selectedText || ""
        this.currentStory = this.fileManager.getCurrentActiveFileOfType("Story")
        this.setLogFile();
    }

    onOpen() {
        if(!this.note) {
            new Notice("Error: Could not create or find log note for current story.")
            this.close();
            return
        }   
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: `Add Log Entry` });

        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.logText)
                    .onChange((value) => {
                        this.logText = value;
                    });
                })


        


        /* ---------------- Stories ---------------- 
        const onStoriesChange = () => { 
            this.note.metadata.stories = this.storySelector?.getSelectedStories() || []
            return this.note.metadata.stories;
        }

        this.storySelector = new StorySelector(this.app, onStoriesChange, true)
        this.storySelector.render(contentEl);

        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
            this.note.metadata.stories = this.storySelector?.getSelectedStories() || []
        }
        */

        /* ---------------- Create Button ---------------- */
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Create Note")
                    .setCta()
                    .onClick(() => {
                        this.createNote()
                        navigator.clipboard.writeText(`[[${this.logText}]]`);
                        this.close();
                    })
            );
    }

    //Create the note file based on the metadata entered
      private async createNote() {
        this.close();
        if(!this.note) return
        //Append the log entry to the note content
        const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        this.note.contents += `**${dateStr} ${timeStr}**\n${this.logText}\n\n`
        const postSaveHandler = new FilePostSaveHandler(this.app, this.settings, {doClipboard: true, doNotify: true}, );
        this.fileManager.saveFile({path: `Notes/${this.note.title}.md`, noteObj: this.note, postSaveHandler: postSaveHandler})
     }


    onClose() {
        this.contentEl.empty();
    }
    
    //Set the log file for the current story, creating one if it doesn't exist
    setLogFile() {
        //No log note without a current story or there's already a log note
        if(!this.currentStory || this.note) return
        //Try to get existing log note for this story
        const logFileName = `${this.currentStory.tFile?.basename} - Log`
        const result = this.fileManager.getFile(`Notes/${logFileName}.md`)
        //If found, use it, otherwise create a new one
        if(result.status === "ok"){
            this.note = result.file as Note
        } else {
            const defaultLogMetadata = {
                title: logFileName,
                category: "Log",
                story: `[[${this.currentStory.tFile?.basename}]]`
            }
            this.note = new Note(null, defaultLogMetadata, {})
            this.fileManager.saveFile({noteObj: this.note, postSaveHandler: new FilePostSaveHandler(this.app, this.settings, {doClipboard: false, doNotify: true}), path: `Notes/${logFileName}.md`})
        }
    }


}
