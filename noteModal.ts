import {
	App,
	Modal,
	Setting,
	TextComponent,
	ToggleComponent,
	DropdownComponent,
	FuzzySuggestModal,
	TFile,
	normalizePath,
	Notice,
} from "obsidian";

/**
 * Fuzzy modal to select a Story note (where frontmatter.type == "story")
 */
class StorySuggestModal extends FuzzySuggestModal<TFile> {
	private stories: TFile[];
	private onChoose: (file: TFile) => void;

	constructor(app: App, stories: TFile[], onChoose: (file: TFile) => void) {
		super(app);
		this.stories = stories;
		this.onChoose = onChoose;
		this.setPlaceholder("Select a Story note...");
	}

	getItems(): TFile[] {
		return this.stories;
	}

	getItemText(item: TFile): string {
		return item.basename;
	}

	onChooseItem(item: TFile): void {
		this.onChoose(item);
	}
}

/**
 * Modal to create a new note
 */
export class NoteModal extends Modal {
	private noteType  = "note";
	private noteTitle = "";
	private storyTitle: string | null = null;
	private category = "";
	private insertIntoCurrent = false;

	// Example category map by type
	private categoriesByType: Record<string, string[]> = {
		note: ["General", "Idea", "Reference"],
		person: ["Friend", "Colleague", "Character"],
		organisation: ["Company", "Club", "Faction"],
		script: ["Scene", "Dialogue", "Outline"],
		event: ["Meeting", "Incident", "Celebration"],
		story: ["Fiction", "Memoir", "Legend"],
		log: ["Daily", "Research", "Development"],
	};

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Create New Note" });

		/* ---------------- Note Type ---------------- */
		new Setting(contentEl)
			.setName("Note Type")
			.setDesc("Select the type of note to create.")
			.addDropdown((dropdown: DropdownComponent) => {
				["note", "person", "organisation", "script", "event", "story", "log"].forEach(
					(type) => dropdown.addOption(type, type)
				);
				dropdown.setValue(this.noteType);
				dropdown.onChange((value) => {
					this.noteType = value;
					this.refreshCategorySelector(contentEl);
				});
			});

		/* ---------------- Title ---------------- */
		new Setting(contentEl)
			.setName("Title")
			.setDesc("Enter the title of the note.")
			.addText((text: TextComponent) => {
				text.setPlaceholder("Note title").onChange((value) => {
					this.noteTitle = value;
				});
			});

		/* ---------------- Story Link ---------------- */
		new Setting(contentEl)
			.setName("Story")
			.setDesc("Optionally link this note to a Story.")
			.addButton((btn) => {
				btn.setButtonText(this.storyTitle ? "Change Story" : "Select Story");
				btn.onClick(async () => {
					const stories = this.getStoryNotes();
					if (stories.length === 0) {
						new Notice("No Story notes found (type == 'story').");
						return;
					}
					new StorySuggestModal(this.app, stories, (file) => {
						this.storyTitle = file.basename;
						btn.setButtonText(`Story: ${this.storyTitle}`);
					}).open();
				});
			});

		/* ---------------- Category ---------------- */
		this.renderCategorySelector(contentEl);

		/* ---------------- Insert Toggle ---------------- */
		new Setting(contentEl)
			.setName("Insert into current document")
			.setDesc("If enabled, the note link will be inserted into the current note.")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.insertIntoCurrent);
				toggle.onChange((val) => (this.insertIntoCurrent = val));
			});

		/* ---------------- Create Button ---------------- */
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Create Note")
					.setCta()
					.onClick(() => this.createNote())
			);
	}

	private renderCategorySelector(container: HTMLElement) {
		new Setting(container)
			.setName("Category")
			.setDesc("Select a category based on note type.")
			.addDropdown((dropdown: DropdownComponent) => {
				const options = this.categoriesByType[this.noteType] || [];
				options.forEach((opt) => dropdown.addOption(opt, opt));
				dropdown.setValue(this.category || options[0] || "");
				dropdown.onChange((val) => (this.category = val));
			});
	}

	private refreshCategorySelector(container: HTMLElement) {
		// Remove old category setting and re-render
		const existing = container.querySelectorAll(".setting-item");
		if (existing.length >= 4) {
			// assume 4th item is category setting
			existing[3].remove();
		}
		this.renderCategorySelector(container);
	}

	private getStoryNotes(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const stories: TFile[] = [];
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type?.toLowerCase() === "story") {
				stories.push(file);
			}
		}
		return stories;
	}

	private async createNote() {
		if (!this.noteTitle) {
			new Notice("Please enter a title.");
			return;
		}

		const fileName = `${this.noteTitle}.md`;
		const filePath = normalizePath(fileName);

		let content = `---\ntype: ${this.noteType}\ncategory: ${this.category}\n`;
		if (this.storyTitle) content += `story: ${this.storyTitle}\n`;
		content += `---\n\n# ${this.noteTitle}\n`;

		const newFile = await this.app.vault.create(filePath, content);

		new Notice(`Created note: ${fileName}`);

		if (this.insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
			const editor = this.app.workspace.activeEditor.editor;
			editor.replaceSelection(`[[${newFile.basename}]]`);
		}

		this.close();
	}

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