import {
    App,
    Modal,
    Setting,
    TFile,
    TextComponent,
    ToggleComponent,
    DropdownComponent,
    normalizePath,
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

    constructor(app: App, defaultText: string, components: string[], doInsert: boolean = false) {
        super(app);
        this.components = components;
        this.person = new Person(null, {}, null)
        console.log("PersonModal person", this.person)
        this.person.metadata.type = "Person";
        this.defaultText = defaultText
        this.insertIntoCurrent = doInsert;
        this.modalUtils = new ModalUtils(app);
    }


    onOpen() {
        const { contentEl } = this;
        const onExistingPersonSelect = (person: TFile) => {
            // Insert link at cursor if insertIntoCurrent is enabled
            if (this.insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
                const editor = this.app.workspace.activeEditor.editor;
                editor.replaceSelection(`[[${person.basename}]]`);
            }
            
            // Close the modal after inserting
            this.close();
            
            return person;
        }

        this.personSelector = new PersonSelector(this.app, this.defaultText, onExistingPersonSelect);
        contentEl.empty();
        contentEl.createEl("h2", { text: `New ${this.person.metadata.type}` });

        if(this.components.includes("title")) {
        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.defaultText)
                    .onChange((value) => {
                        this.person.title = value;
                        this.personSelector.onInputUpdate(value)
                    });
                })

        }



        /* ---------------- Existing People Suggestions ---------------- */


        this.personSelector.render(this.contentEl);
        
        if(this.components.includes("category")) {
            /* ---------------- Category ---------------- */
            const categorySelectorOnSelect  = (selectedCategory: string) => {
                this.person.metadata.category = selectedCategory;
            }
            const categorySelector = new CategorySelector(this.app, "Note", categorySelectorOnSelect);
            categorySelector.renderCategorySelector(contentEl);
            categorySelector.renderNewCategoryInput(contentEl);
        }



        if(this.components.includes("stories")) {
        /* ---------------- Story ---------------- */
            const onStorySelect = (file: TFile) => { 
                this.person.metadata.story = [`[[${file.basename}]]`];
                return this.person.metadata.story;
            }
            const storyModal = new StorySelector(this.app, onStorySelect);
            storyModal.render(contentEl);
        }

        if(this.components.includes("story")) {
        /* ---------------- Story ---------------- */
            const onStorySelect = (file: TFile) => { 
                this.person.metadata.story = `[[${file.basename}]]`;
                return this.person. metadata.story;
            }
            const storyModal = new StorySelector(this.app, onStorySelect);
            storyModal.render(contentEl);
        }

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

    private async createNote() {
        console.log("Creating note with metadata:", this.person.metadata);
        const fileManager = new FileManager(this.app, {}); 
        const noteObj = {	
            title: this.person.title,
            metadata: this.person.metadata
        }
        
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

        const onSave = this.modalUtils.createSaveCallback(showNotice)

        const newNote = fileManager.saveFile({
            path: `People/${this.person.title}.md`, 
            noteObj: this.person, onSave
        })
    }


    onClose() {
        this.contentEl.empty();
    }
}
