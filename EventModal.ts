import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import Event from 'Event'
import StorySelector from 'StorySelector';
import { FileManager } from 'fileManagement';
import { ModalUtils } from 'ModalUtils';
import { de } from 'chrono-node';

//Displays an Obsidian modal to create an event note
export default class EventModal extends Modal {

    private event: Event;
    private modalUtils: ModalUtils;

    constructor(app: App, type: string, selectedText: string, settings: any) {

        super(app);
        this.setTitle(`${type} Event`)
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

        let descriptionInput: any
        let yearInput: any
        let monthInput: any
        let dayInput: any
        let dateDiv: any

        this.event = new Event(null, {description: selectedText}, settings)
        this.modalUtils = new ModalUtils(app);

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

        dateDiv = this.contentEl.createEl("div", { text: `Date: ${this.event.toDateString()}` });

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
            this.event.metadata.story = `[[${file.basename}]]`;
            return this.event.metadata.story;
        }
        const storyModal = new StorySelector(this.app, onStorySelect);
        storyModal.render(this.contentEl);

     

        new Setting(this.contentEl)
            .addButton((btn) => btn
            .setButtonText('Submit')
            .setCta()
            .onClick(() => {
                this.close();
                const fileManager = new FileManager(this.app, {})
                const showNotice = (result: any) => {
                    new Notice(result.message)
                }
		        const onSave = this.modalUtils.createSaveCallback(showNotice)
                fileManager.saveFile({path: `Events/${this.event.metadata.title}.md`, noteObj: this.event, onSave})
            }));
    }
}