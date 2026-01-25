import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, editorLivePreviewField } from 'obsidian';
import Event from './Event'
import EventModal from './EventModal';
import { FileWrangler, FileManager, FileAnalyzer } from './fileManagement';
import { NoteModal } from './NoteModal'; 
import { PersonModal } from './PersonModal';
import DurationCounter from './DurationCounter';
import { createReadingTimePlugin } from './readingTimePlugin';
import { LogModal } from './LogModal';



//An Obsidian plugin providing tools for journalists.
interface NewsOrganiserSettings {
	wpm: number;
	keyNoteMarker: string;
}

const DEFAULT_SETTINGS: NewsOrganiserSettings = {
	wpm: 200,
	keyNoteMarker: '~'
}	

export default class NewsOrganiser extends Plugin {
	settings: NewsOrganiserSettings

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
	}
}

