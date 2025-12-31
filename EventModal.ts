import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import Event from './Event'
import StorySelector from './StorySelector';
import { FileManager, FilePostSaveHandler } from './fileManagement';
import { ModalUtils } from './ModalUtils';
import { de } from 'chrono-node';
import { doesNotMatch } from 'assert';

//Displays an Obsidian modal to create an event note
export default class EventModal extends Modal {

    private event: Event;
    private modalUtils: ModalUtils;
    private fileManager: FileManager
    private storySelector: StorySelector | null = null
    //The currently active story note when the modal is opened. Null if none or not a story
    private currentFile: any | undefined 
    private selectedText: string
    private settings: any

    constructor(app: App, selectedText: string, settings: any = {}) {

        super(app);
        this.fileManager = new FileManager(app, {});
        this.currentFile = this.fileManager.getCurrentActiveFileOfType(null)
        this.selectedText = selectedText || ""
        this.modalUtils = new ModalUtils(app);
        
        //Add a listener for Enter key to submit the form
        this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
            if (evt.isComposing) {
                return;
            }
            evt.preventDefault()	
            const actionBtn = document
                    .getElementsByClassName('mod-cta')
                    .item(0) as HTMLButtonElement | null;
                actionBtn?.click();
        });

        //The event being created
        this.event = new Event(null, {
            description: selectedText
        }, settings)
        this.modalUtils = new ModalUtils(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: `New Event` });
        let descriptionInput: any
        let yearInput: any
        let monthInput: any
        let dayInput: any
        let dateDiv: any

        /* ---------------- Description ---------------- */ 

        new Setting(this.contentEl)
            .setName('Description')
            .addTextArea((text) => {
                descriptionInput = text
                text
                    .setValue(this.event.metadata.description)
                    .onChange((value) => {
                        this.event.setMetadata({description: value});
                        dayInput.setValue(this.event.metadata.day ? this.event.metadata.day.toString() : "");
                        monthInput.setValue(this.event.metadata.month ? this.event.metadata.month.toString() : "");
                        yearInput.setValue(this.event.metadata.year ? this.event.metadata.year.toString() : "");
                        dateDiv.setText(`Date: ${this.event.toDateString()}`);
                    });
                })

        dateDiv = this.contentEl.createEl("h5", { text: `Date: ${this.event.toDateString()}` });

        /* ---------------- Date Components ---------------- */
        new Setting(this.contentEl)
            .setName('Day')
            .addText((text) => {
                dayInput = text
                text
                    .setValue(this.event.metadata.day ? this.event.metadata.day.toString() : "")
                    .onChange((value) => {
                        this.event.setMetadata({day: Number(value)})
                        if(this.event.isValid()){
                            dateDiv.setText(`Date: ${this.event.toDateString()}`);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })

        new Setting(this.contentEl)
            .setName('Month')
            .addText((text) => {
                monthInput = text
                text
                    .setValue(this.event.metadata.month ? this.event.metadata.month.toString() : "")
                    .onChange((value) => {
                        this.event.setMetadata({month: Number(value)});
                        if(this.event.isValid()){
                            dateDiv.setText(`Date: ${this.event.toDateString()}`);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })

        new Setting(this.contentEl)
            .setName('Year')
            .addText((text) => {
                yearInput = text
                text
                    .setValue(this.event.metadata.year ? this.event.metadata.year.toString() : "")
                    .onChange((value) => {
                        this.event.setMetadata({year: Number(value)});
                        if(this.event.isValid()){
                            dateDiv.setText(`Date: ${this.event.toDateString()}`);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })

        /* ---------------- Story ---------------- */
        const onStorySelect = (file: TFile) => { 
            //Get the selected story from the story selector
            this.event.metadata.stories = this.storySelector?.getSelectedStories() || null
            return file.basename
        }

        this.storySelector = new StorySelector(this.app, onStorySelect, true)

        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
            this.event.metadata.stories = this.storySelector?.getSelectedStories() || null
        }

        this.storySelector.render(contentEl);


        /* ---------------- Submit Button ---------------- */
        new Setting(this.contentEl)
            .addButton((btn) => btn
            .setButtonText('Submit')
            .setCta()
            .onClick(() => {
                this.close();
                const postSaveHandler = new FilePostSaveHandler(this.app, this.settings, {doClipboard: true, doNotify: true}, );
                this.fileManager.saveFile({path: `Events/${this.event.title}.md`, noteObj: this.event, postSaveHandler: postSaveHandler})
            })

        );
    }
    
}