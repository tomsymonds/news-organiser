import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, editorLivePreviewField } from 'obsidian';
import Event from './Event'
import EventModal from './EventModal';
import { FileWrangler, FileManager, FileAnalyzer, FilePostSaveHandler } from './fileManagement';
import { NoteModal } from './NoteModal'; 
import { PersonModal } from './PersonModal';
import DurationCounter from './DurationCounter';
import { createReadingTimePlugin } from './readingTimePlugin';
import { LogModal } from './LogModal';
import Note from './Note';



//An Obsidian plugin providing tools for journalists.
interface NewsOrganiserSettings {
	wpm: number;
	keyNoteMarker: string;
	includeHeadings: boolean;
}

const DEFAULT_SETTINGS: NewsOrganiserSettings = {
	wpm: 200,
	keyNoteMarker: '~',
	includeHeadings: false
}	

export default class NewsOrganiser extends Plugin {
	settings!: NewsOrganiserSettings

	async onload() {
		await this.loadSettings();
		
		// Register editor extension with getter function for reactive updates
		this.registerEditorExtension([createReadingTimePlugin({
			getWordsPerMinute: () => this.settings.wpm,
			requiredFrontmatterType: 'Script'
		})]);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
 			id: "news-organiser-create-note",
 			name: "Create Note",
 			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new NoteModal(this.app, text, this.settings).open()
			}
 		});

		this.addCommand({
 			id: "news-organiser-create-person",
 			name: "Create Person",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new PersonModal(this.app, text, this.settings).open()
			}
 		});

		this.addCommand({
			id: 'news-organiser-create-script',
			name: 'Create Script',
			callback: async () => {
				const currentStoryLink = this.getCurrentStoryLink();
				if (!currentStoryLink) {
					new Notice('Open a Story note, or a Note with at least one item in stories, then try again.');
					return;
				}

				const scriptTitle = await this.promptForScriptTitle();
				if (!scriptTitle) {
					new Notice('Script creation cancelled.');
					return;
				}

				const scriptNote = new Note(null, {
					type: 'Script',
					stories: [currentStoryLink],
				}, this.settings);
				delete scriptNote.metadata.title;
				scriptNote.title = scriptNote.titleSanitize(scriptTitle);

				const fileManager = new FileManager(this.app, this.settings);
				const postSaveHandler = new FilePostSaveHandler(this.app, this.settings, {
					doNotify: true,
					doClipboard: false,
				});
				const openOnSaveHandler = {
					do: (result: any) => {
						postSaveHandler.do(result);
						if (result.status === 'ok' && result.file?.tFile) {
							const leaf = this.app.workspace.getUnpinnedLeaf();
							leaf.openFile(result.file.tFile);
							this.app.workspace.setActiveLeaf(leaf);
						}
					}
				};

				fileManager.saveFile({
					path: `Scripts/${scriptNote.title}.md`,
					noteObj: scriptNote,
					postSaveHandler: openOnSaveHandler,
				});
			}
		});
		
		this.addCommand({
			id: 'news-organiser-get-key-notes',
			name: 'Get Key Notes',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}
				
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const selection = view?.editor?.getSelection() || "";
				
				const fileAnalyzer = new FileAnalyzer(this.app, this.settings);
				const keyNotes = await fileAnalyzer.getKeyNotes(activeFile.path, selection);
				if (keyNotes.length === 0) {
					new Notice('No key notes found.');
					return;
				}
				// Copy key note text to clipboard
				const notesText = keyNotes.join('\n\n');
				navigator.clipboard.writeText(notesText);
				new Notice(`Found ${keyNotes.length} key note${keyNotes.length === 1 ? '' : 's'} (copied to clipboard)`);
			}
		})

		this.addCommand({
			id: 'news-organiser-get-key-notes-as-embeds',
			name: 'Get Key Notes as Embeds',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}
				
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const selection = view?.editor?.getSelection() || "";
				
				const fileAnalyzer = new FileAnalyzer(this.app, this.settings);
				const embedLinks = await fileAnalyzer.getKeyNotesWithBlockLinks(activeFile.path, selection);
				if (embedLinks.length === 0) {
					new Notice('No key notes found.');
					return;
				}
				// Copy links to clipboard
				const linksText = embedLinks.join('\n');
				navigator.clipboard.writeText(linksText);
				new Notice(`Found ${embedLinks.length} key note${embedLinks.length === 1 ? '' : 's'} (copied to clipboard)`);
			}
		})

		this.addCommand({
			id: 'news-organiser-remove-key-notes',
			name: 'Remove Key Note Markers',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}
				
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const selection = view?.editor?.getSelection() || "";
				
				const fileAnalyzer = new FileAnalyzer(this.app, this.settings);
				const result = await fileAnalyzer.removeKeyNoteMarkers(activeFile.path, selection);
				
				if (selection && view?.editor) {
					// Replace the selection with cleaned text
					view.editor.replaceSelection(result);
					new Notice('Removed key note markers from selection');
				} else {
					new Notice('Removed all key note markers from file');
				}
			}
		})

		// Create an event from selected text, open a modal to edit details, and save to file
		this.addCommand({
			id: 'news-organiser-create-event',
			name: 'Create Event',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new EventModal(this.app, text, this.settings).open()
			}
		});

		// Create an event from selected text, open a modal to edit details, and save to file
		this.addCommand({
			id: 'news-organiser-create-log-entry',
			name: 'Add Log Entry',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new LogModal(this.app, text, this.settings).open()
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EventSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));


		/* Views */

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private promptForScriptTitle(): Promise<string | null> {
		return new Promise((resolve) => {
			new ScriptTitleModal(this.app, resolve).open();
		});
	}

	private getCurrentStoryLink(): string | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeFile = activeView?.file ?? this.app.workspace.getActiveFile();
		if (!activeFile) return null;

		const fileCache = this.app.metadataCache.getFileCache(activeFile);
		const type = fileCache?.frontmatter?.type;

		if (typeof type === 'string' && type.toLowerCase() === 'story') {
			return `[[${activeFile.basename}]]`;
		}

		if (typeof type === 'string' && type.toLowerCase() === 'note') {
			const stories = fileCache?.frontmatter?.stories;
			if (Array.isArray(stories) && stories.length > 0 && typeof stories[0] === 'string') {
				return this.toWikiStoryLink(stories[0]);
			}
			if (typeof stories === 'string') {
				return this.toWikiStoryLink(stories.split(',')[0]);
			}

			const story = fileCache?.frontmatter?.story;
			if (typeof story === 'string') {
				const storyLink = this.toWikiStoryLink(story);
				if (storyLink) return storyLink;
			}

			const category = fileCache?.frontmatter?.category;
			if (typeof category === 'string') {
				const trimmedCategory = category.trim();
				if (trimmedCategory.toLowerCase().startsWith('story')) {
					return this.toWikiStoryLink(trimmedCategory);
				}
			}
		}

		return null;
	}

	private toWikiStoryLink(value: string | undefined): string | null {
		const trimmed = value?.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) return trimmed;
		return `[[${trimmed}]]`;
	}

}

class ScriptTitleModal extends Modal {
	private onSubmit: (value: string | null) => void;
	private titleValue = '';
	private isResolved = false;

	constructor(app: App, onSubmit: (value: string | null) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Create Script' });

		new Setting(contentEl)
			.setName('Title')
			.addText((text) => {
				text
					.setPlaceholder('Script title')
					.onChange((value) => {
						this.titleValue = value;
					});
				window.setTimeout(() => text.inputEl.focus(), 0);
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Create Script')
					.setCta()
					.onClick(() => {
						const trimmed = this.titleValue.trim();
						if (!trimmed) {
							new Notice('Script title is required.');
							return;
						}
						this.resolve(trimmed);
						this.close();
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText('Cancel')
					.onClick(() => {
						this.resolve(null);
						this.close();
					})
			);

		this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
			if (evt.isComposing) return;
			evt.preventDefault();
			const trimmed = this.titleValue.trim();
			if (!trimmed) {
				new Notice('Script title is required.');
				return;
			}
			this.resolve(trimmed);
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
		this.resolve(null);
	}

	private resolve(value: string | null) {
		if (this.isResolved) return;
		this.isResolved = true;
		this.onSubmit(value);
	}
}

class EventSettingsTab extends PluginSettingTab {
	plugin: NewsOrganiser;

	constructor(app: App, plugin: NewsOrganiser) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		//Setting for default event type - 
		new Setting(containerEl)
			.setName('Reading Speed')
			.setDesc('Script reading speed, words per minute')
			.addText(text => text
				.setPlaceholder('words per minute')
				.setValue(this.plugin.settings.wpm.toString())
				.onChange(async (value) => {
					const numValue = parseInt(value);
					if (!isNaN(numValue) && numValue > 0) {
						this.plugin.settings.wpm = numValue;
						await this.plugin.saveSettings();
						// Trigger editor reconfiguration to refresh reading times
						this.app.workspace.iterateAllLeaves(leaf => {
							if (leaf.view instanceof MarkdownView && leaf.view.editor) {
								// @ts-ignore - internal API
								leaf.view.editor.cm?.dispatch({});
							}
						});
					}
				}));

		new Setting(containerEl)
			.setName('Key Note Marker')
			.setDesc('Character used to mark key notes in your documents')
			.addText(text => text
				.setPlaceholder('~')
				.setValue(this.plugin.settings.keyNoteMarker)
				.onChange(async (value) => {
					if (value.length > 0) {
						this.plugin.settings.keyNoteMarker = value.charAt(0);
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Include Headings')
			.setDesc('Include all headings in key note blocks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeHeadings)
				.onChange(async (value) => {
					this.plugin.settings.includeHeadings = value;
					await this.plugin.saveSettings();
				}));
	}
}

