import {
    App,
    Modal,
    Setting,
    TFile,
    Notice,
} from "obsidian";

import PersonSelector from "./PersonSelector";
import StorySelector from "StorySelector";
import CategorySelector from "./CategorySelector";
import { FileManager } from "fileManagement";
import { ModalUtils } from "./ModalUtils";
import { Person } from 'Person'


/**
 * Modal to create a new note
 */
export class PersonModal extends Modal {
    private person: Person;
    private insertIntoCurrent = false;
    private components: string[] = []
    private defaultText: string
    private modalUtils: ModalUtils;
    private personSelector: any
    private fileManager: FileManager
    private nameTextArea: any = null
    private categorySelector: CategorySelector 
    private storySelector: StorySelector | null = null
    private currentStory: TFile | undefined

    constructor(app: App, defaultText: string, components: string[], doInsert: boolean = false) {
        super(app);
        this.components = components;
        this.person = new Person(null, {}, null)
        this.person.metadata.type = "Person";
        this.defaultText = defaultText
        this.insertIntoCurrent = doInsert;
        this.modalUtils = new ModalUtils(app);
        this.fileManager = new FileManager(app, {});
        this.currentStory = this.fileManager.getCurrentActiveFileOfType("Story")
    }

    onOpen() {
        const { contentEl } = this;

        // Callback when a story is selected
        const onStorySelect = (file: TFile): string => { 
            this.person.metadata.stories = this.storySelector?.getSelectedStories() || []
            return file.basename
        }

        // Callback when an existing person is selected
        const onExistingPersonSelect = (person: TFile) => {
            const personObj = this.fileManager.getFile(person.path).file
            if(personObj && personObj.tFile){
                this.nameTextArea.setValue(personObj.title);
                this.categorySelector.setCategoryValue(personObj.metadata.category)
                this.storySelector?.setSelectedStories(personObj.metadata.stories || [])
                this.person = personObj;
            } else {
                return;
            }
        }

        this.personSelector = new PersonSelector(this.app, this.defaultText, onExistingPersonSelect);
        contentEl.empty();
        contentEl.createEl("h2", { text: `New ${this.person.metadata.type}` });

        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Name') //Though we call it title internally, for a Person it's more intuitive to call it Name
            .addTextArea((text) => {
                this.nameTextArea = text;
                text
                    .setValue(this.defaultText)
                    .onChange((value) => {
                        this.person.title = value;
                        this.personSelector.onInputUpdate(value)
                    });
                })



        /* ---------------- Existing People Suggestions ---------------- */
        this.personSelector.render(this.contentEl);
        /* ---------------- Category ---------------- */
        const categorySelectorOnSelect  = (selectedCategory: string) => {
            this.person.metadata.category = selectedCategory;
        }
        this.categorySelector = new CategorySelector(this.app, "Person", categorySelectorOnSelect);
        this.categorySelector.renderCategorySelector(contentEl);
        this.categorySelector.renderNewCategoryInput(contentEl);


        /* ---------------- Stories ---------------- */
        this.storySelector = new StorySelector(this.app, onStorySelect, true);
        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
        }
        this.storySelector.render(contentEl);

        /* ---------------- Create Button ---------------- */
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Create Note")
                    .setCta()
                    .onClick(() => {
                        this.createNote()
                        this.close();
                    })
            );
    }

    //Create the new note file
    private async createNote() {
        const noteObj = {	
            title: this.person.title,
            metadata: this.person.metadata
        }
        
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

        const onSave = this.modalUtils.createSaveCallback(showNotice)

        const newNote = this.fileManager.saveFile({
            path: `People/${this.person.title}.md`, 
            noteObj, onSave
        })
    }

    onClose() {
        this.contentEl.empty();
    }
}
