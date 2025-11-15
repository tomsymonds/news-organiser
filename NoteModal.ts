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

import StorySelector from "./StorySelector";
import CategorySelector from "./CategorySelector";
import { FileManager } from "fileManagement";
import { ModalUtils } from "./ModalUtils";


/**
 * Modal to create a new note
 */
export class NoteModal extends Modal {
	private metadata: any = {
		type: "",
		title: "",
		category: "",
		story: "",	
	};
	private insertIntoCurrent = false;
	private components: string[] = []
	private type: string
	private modalUtils: ModalUtils;

	constructor(app: App, type: string, components: string[]) {
		super(app);
		this.components = components;
		this.metadata.type = type;
		this.modalUtils = new ModalUtils(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: `New ${this.metadata.type}` });

		if(this.components.includes("title")) {
		/* ---------------- Title ---------------- */
		new Setting(contentEl)
			.setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.metadata.title)
                    .onChange((value) => {
						this.metadata.title = value;
                    });
                })

		}
		
		if(this.components.includes("category")) {
			/* ---------------- Category ---------------- */
			const categorySelectorOnSelect  = (selectedCategory: string) => {
				this.metadata.category = selectedCategory;
			}
			const categorySelector = new CategorySelector(this.app, "Note", categorySelectorOnSelect);
			categorySelector.renderCategorySelector(contentEl);
			categorySelector.renderNewCategoryInput(contentEl);
		}

		if(this.components.includes("stories")) {
		/* ---------------- Story ---------------- */
			const onStorySelect = (file: TFile) => { 
				this.metadata.story = [`[[${file.basename}]]`];
				return this.metadata.story;
			}
			const storyModal = new StorySelector(this.app, onStorySelect);
			storyModal.render(contentEl);
		}

		if(this.components.includes("story")) {
		/* ---------------- Story ---------------- */
			const onStorySelect = (file: TFile) => { 
				this.metadata.story = `[[${file.basename}]]`;
				return this.metadata.story;
			}
			const storyModal = new StorySelector(this.app, onStorySelect);
			storyModal.render(contentEl);
		}

		// /* ---------------- Insert Toggle ---------------- */
		// new Setting(contentEl)
		// 	.setName("Insert into current document")
		// 	.setDesc("If enabled, the note link will be inserted into the current note.")
		// 	.addToggle((toggle: ToggleComponent) => {
		// 		toggle.setValue(this.insertIntoCurrent);
		// 		toggle.onChange((val) => (this.insertIntoCurrent = val));
		// 	});

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

	// private getStoryNotes(): TFile[] {
	// 	const files = this.app.vault.getMarkdownFiles();
	// 	const stories: TFile[] = [];
	// 	for (const file of files) {
	// 		const cache = this.app.metadataCache.getFileCache(file);
	// 		if (cache?.frontmatter?.type?.toLowerCase() === "story") {
	// 			stories.push(file);
	// 		}
	// 	}
	// 	return stories;
	// }

	 private async createNote() {
		console.log("Creating note with metadata:", this.metadata);
		const fileManager = new FileManager(this.app, {}); 
		const noteObj = {	
			title: this.metadata.title,
			metadata: this.metadata
		}
		
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

		const onSave = this.modalUtils.createSaveCallback(showNotice)
		
		const newNote = fileManager.saveFile({
			path: `${this.metadata.type}s/${this.metadata.title}.md`, 
			noteObj, onSave
	 	})
	}


	// 	if (!this.noteTitle) {
	// 		new Notice("Please enter a title.");
	// 		return;
	// 	}

	// 	const fileName = `${this.noteTitle}.md`;
	// 	const filePath = normalizePath(fileName);

	// 	let content = `---\ntype: ${this.noteType}\ncategory: ${this.category}\n`;
	// 	if (this.storyTitle) content += `story: ${this.storyTitle}\n`;
	// 	content += `---\n\n# ${this.noteTitle}\n`;

	// 	const newFile = await this.app.vault.create(filePath, content);

	// 	new Notice(`Created note: ${fileName}`);

	// 	if (this.insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
	// 		const editor = this.app.workspace.activeEditor.editor;
	// 		editor.replaceSelection(`[[${newFile.basename}]]`);
	// 		}

	// 	this.close();
	// }

	onClose() {
		this.contentEl.empty();
	}
}
// ⚙️ Usage Example in Your Plugin
// ts
// Copy code
// import { Plugin } from "obsidian";
// import { CreateNoteModal } from "./CreateNoteModal";

// export default class MyPlugin extends Plugin {
// 	onload() {
// 		this.addCommand({
// 			id: "create-note-modal",
// 			name: "Create New Note (Modal)",
// 			callback: () => new CreateNoteModal(this.app).open(),
// 		});
// 	}
// }