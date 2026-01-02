import {
    App,
    Setting,
    TFile
} from "obsidian";

import PersonSelector from "./PersonSelector";
import StorySelector from "./StorySelector";
import CategorySelector from "./CategorySelector";
import { FilePostSaveHandler } from "./fileManagement";
import { Person } from './Person'
import NewsModal from "./NewsModal";

/**
 * Modal to create a new note
 */
export class PersonModal extends NewsModal {
    private person: Person;
    private selectedText: string | ""
    private personSelector: any
    private nameTextArea: any = null
    private categorySelector: CategorySelector 
    private storySelector: StorySelector | null = null
    private currentStory: TFile | undefined
    private type: string = "Person"

    constructor(app: App, selectedText: string | "", settings: any = {}) {
        super(app);
        //this.components = components;
        this.person = new Person(null, {}, null)
        this.person.metadata.type = "Person";
        this.selectedText = selectedText || ""
        this.currentStory = this.fileManager.getCurrentActiveFileOfType("Story")
        this.selectedText = selectedText || ""
    }


    onOpen() {
        const { contentEl } = this;
        this.person.metadata.title = this.selectedText || ""
		this.person.setTitle()

        // Callback when a story is selected
	    const onStoriesChange = () => { 
            this.person.metadata.stories = this.storySelector?.getSelectedStories() || []
            return this.person.metadata.stories;
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

        this.personSelector = new PersonSelector(this.app, this.selectedText, onExistingPersonSelect);
        contentEl.empty();
        contentEl.createEl("h2", { text: `New ${this.person.metadata.type}` });

        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Name') //Though we call it title internally, for a Person it's more intuitive to call it Name
            .addTextArea((text) => {
                this.nameTextArea = text;
                text
                    .setValue(this.selectedText)
                    .onChange((value) => {
                        this.person.setTitle(value);
                        this.personSelector.onInputUpdate(value)
                    });
                })


        /* ---------------- Existing People Suggestions ---------------- */
        this.personSelector.render(this.contentEl);
        this.personSelector.onInputUpdate(this.person.title)

        /* ---------------- Category ---------------- */
        const categorySelectorOnSelect  = (selectedCategory: string) => {
            this.person.metadata.category = selectedCategory;
        }
        this.categorySelector = new CategorySelector(this.app, "Person", categorySelectorOnSelect);
        this.categorySelector.renderCategorySelector(contentEl);
        this.categorySelector.renderNewCategoryInput(contentEl);


        /* ---------------- Stories ---------------- */
        this.storySelector = new StorySelector(this.app, onStoriesChange, true);
        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
            this.person.metadata.stories = this.storySelector?.getSelectedStories() || []
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
        const postSaveHandler = new FilePostSaveHandler(this.app, this.settings, {doClipboard: true, doNotify: true}, );
        this.fileManager.saveFile({path: `People/${this.person.title}.md`, noteObj: this.person, postSaveHandler: postSaveHandler})
    }

    onClose() {
        this.contentEl.empty();
    }
}
