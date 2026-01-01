import {
	App,
	FuzzySuggestModal,
	TFile,
	Setting,
	TextComponent,
} from "obsidian";


/**
 * Fuzzy modal to select a Story note 
 */
export default class StorySelector extends FuzzySuggestModal<TFile> {
    private stories: TFile[];
    private onChange: any;
    private storyTextComponent: TextComponent | null = null;
    private suggestionsContainer: HTMLElement | null = null;
    private selectedStories: string[] = [];
    private selectedStoriesContainer: HTMLElement | null = null;
    private isList: boolean = true;

    constructor(app: App, onChange: (file: TFile) => string, isList: boolean = true) {
        super(app);
        this.onChange = onChange;
        this.isList = isList;
        this.setPlaceholder("Select a Story");
    }

    //Get all notes with frontmatter.type == "story"
	private getStoryNotes(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const stories: TFile[] = [];
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type?.toLowerCase() === "story") {
				stories.push(file);
			}
		}
		return stories
    }

    //Provide the list of items for the fuzzy search
    getItems(): TFile[] {
        return this.getStoryNotes();
    }

    //Display text for each item in the fuzzy search list
    getItemText(item: TFile): string {
        return item.basename;
    }

    //Handle item selection
    onChooseItem(item: TFile): void {
        this.onChange();
    }
    //Render the story suggestions and recent stories UI
    render(container: HTMLElement): void {
        const stories = this.getStoryNotes();
        this.renderStoryTextBox(container, stories);
        this.renderSelectedStories(container);
        // Create suggestions container after selected stories so it appears below
        this.createSuggestionsContainer(container);
    }

    /**
     * Renders a text box with auto-complete suggestions for story titles
     */
    renderStoryTextBox(container: HTMLElement, stories: TFile[]): TextComponent {
        const onStorySelect = this.onChange;
        let selectedStory: TFile | null = null;

        const setting = new Setting(container)
            .setName(`Stor${this.isList ? "ies" : "y"}`)
            .addText((text: TextComponent) => {
                // Store reference to text component
                this.storyTextComponent = text;
                text.setPlaceholder("Search");
                text.onChange((value: string) => {
                    selectedStory = null;
                    this.showSuggestions(value, stories, this.suggestionsContainer!, text, onStorySelect);
                });

                // Show recent stories when text box is focused (by default)
                text.inputEl.addEventListener('focus', () => {
                    if (!text.getValue().trim()) {
                        this.showSuggestions('', stories, this.suggestionsContainer!, text, onStorySelect);
                    }
                });

                // Hide suggestions when clicking outside
                text.inputEl.addEventListener('blur', () => {
                    setTimeout(() => {
                        if (this.suggestionsContainer) {
                            this.suggestionsContainer.style.display = 'none';
                        }
                    }, 150);
                });

                return text;
            });
        
        return setting.components[0] as TextComponent;
    }

    //Create the container for story suggestions
    private createSuggestionsContainer(container: HTMLElement): void {
        // Create suggestions container after other elements
        this.suggestionsContainer = container.createEl("div", {
            cls: "story-suggestions",
            attr: { style: "display: none; border: 1px solid var(--background-modifier-border); max-height: 200px; overflow-y: auto; z-index: 1000; background: var(--background-primary);" }
        });
    }

    //Show suggestions based on the current input query
    private showSuggestions(
        query: string, //The current input query
        stories: TFile[], 
        container: HTMLElement, 
        textComponent: TextComponent,
        onStorySelect?: (file: TFile | null) => string
    ): void {
        container.empty();
        container.style.display = 'block';
        
        // If no query, show recent stories by default
        if (!query.trim()) {
            this.renderRecentStoriesInline(container, textComponent, onStorySelect);
            return;
        }

        // Filter stories based on query
        const filteredStories = stories.filter(story => 
            story.basename.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions

        // If no matches found, show recent stories instead
        if (filteredStories.length === 0) {
            this.renderRecentStoriesInline(container, textComponent, onStorySelect);
            return;
        }

        // Render the filtered story suggestions
        this.renderStoryItems(filteredStories, container, textComponent, onStorySelect);
    }

    //Render individual story suggestion items
    private renderStoryItems(
        stories: TFile[], 
        container: HTMLElement, 
        textComponent: TextComponent, 
        onStorySelect?: (file: TFile | null) => string
    ): void {
        stories.forEach(story => {
            const suggestionEl = container.createEl("div", {
                text: story.basename,
                cls: "story-suggestion-item",
                attr: { 
                    style: "color: #058239; font-weight: bold; padding: 8px; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border);" 
                }
            });

            suggestionEl.addEventListener('hover', () => {
                suggestionEl.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            suggestionEl.addEventListener('mouseleave', () => {
                suggestionEl.style.backgroundColor = '';
            });

            suggestionEl.addEventListener('click', () => {
                this.addStories([`[[${story.basename}]]`]);
                textComponent.setValue('');
                container.style.display = 'none';
                onStorySelect?.(story);
            });
        });
    }

    //Render recent stories inline below the text box
    private renderRecentStoriesInline(
        container: HTMLElement, 
        textComponent: TextComponent, 
        onStorySelect?: (file: TFile | null) => string
    ): void {
        const recentStories = this.getRecentStories();
        
        if (recentStories.length === 0) {
            container.createEl("div", {
                text: "No stories found",
                attr: { style: "padding: 8px; color: var(--text-muted);" }
            });
            return;
        }

        // Add header
        container.createEl("div", {
            text: "Recent Stories",
            attr: { 
                style: "padding: 8px 12px; font-weight: 600; border-bottom: 1px solid var(--background-modifier-border); background: var(--background-modifier-form-field);" 
            }
        });

        // Render recent stories using the same format as suggestions
        this.renderStoryItems(recentStories, container, textComponent, onStorySelect);
    }

    //Get the 5 most recently modified story notes
    getRecentStories(){
        const stories = this.getStoryNotes();
        
        // Sort by modification time (newest first) and take top 3
        return stories
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 5);
    }

    /**
     * Creates a selectable list of the 5 most recently modified story notes
     */
    renderRecentStories(container: HTMLElement): void {
        const stories = this.getStoryNotes();
        
        // Sort by modification time (newest first) and take top 3
        const recentStories = stories
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 5);

        if (recentStories.length === 0) {
            container.createEl("div", {
                text: "No recent stories found",
                attr: { style: "padding: 8px; color: var(--text-muted);" }
            });
            return;
        }

        const listContainer = container.createEl("div", {
            cls: "recent-stories-list",
            attr: { style: "border: 1px solid var(--background-modifier-border); border-radius: 6px;" }
        });

        const headerEl = listContainer.createEl("div", {
            text: "Recent Stories",
            attr: { 
                style: "padding: 8px 12px; border-bottom: 1px solid var(--background-modifier-border));" 
            }
        });

        recentStories.forEach((story, index) => {
            const lastModified = new Date(story.stat.mtime);
            const timeAgo = this.getTimeAgo(lastModified);
            
            const storyEl = listContainer.createEl("div", {
                cls: "recent-story-item",
                attr: { 
                    style: "padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" + 
                           (index < recentStories.length - 1 ? " border-bottom: 1px solid var(--background-modifier-border);" : "")
                }
            });

            const titleEl = storyEl.createEl("span", {
                text: story.basename,
                // attr: { style: "font-weight: 500;" }
            });

            const timeEl = storyEl.createEl("span", {
                text: timeAgo,
                attr: { style: "color: var(--text-muted); font-size: 0.9em;" }
            });

            storyEl.addEventListener('hover', () => {
                storyEl.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            storyEl.addEventListener('mouseleave', () => {
                storyEl.style.backgroundColor = '';
            });

            storyEl.addEventListener('click', () => {
                // Clear suggestions and populate text box
                if (this.suggestionsContainer) {
                    this.suggestionsContainer.style.display = 'none';
                }
                if (this.storyTextComponent) {
                    this.storyTextComponent.setValue('');
                }
                this.addStories([`[[${story.basename}]]`]);
                this.onChange();
            });
        });
    }

    //Return a human-readable "time ago" string for a given date
    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    //Add a stories to the selected stories list
    //Takes a string of story links in the format [[story1]], [[story2]]
    addStories(stories: string[]): void {
        stories.forEach((story) => {
            if (!this.selectedStories.includes(story)) {
                this.selectedStories.push(story);
            }
        });
        this.updateSelectedStoriesDisplay();
    }

    //Remove a story from the selected stories list
    private removeStory(storyLink: string): void {
        if (!Array.isArray(this.selectedStories)) {
            this.selectedStories = [];
        }
        this.selectedStories = this.selectedStories.filter(s => s !== storyLink);
        this.updateSelectedStoriesDisplay();
        this.onChange();
    }

    //Render the selected stories container
    private renderSelectedStories(container: HTMLElement): void {
        this.selectedStoriesContainer = container.createEl('div', {
            cls: 'selected-stories-container',
            attr: { style: 'margin-bottom: 10px;' }
        });
        this.updateSelectedStoriesDisplay();
    }

    //Update the display of selected stories
    private updateSelectedStoriesDisplay(): void {
        if (!this.selectedStoriesContainer) return;
        
        if (!Array.isArray(this.selectedStories)) {
            this.selectedStories = [];
        }
        
        this.selectedStoriesContainer.empty();
        if (this.selectedStories.length === 0) return;

        const label = this.selectedStoriesContainer.createEl('div', {
            attr: { style: 'font-weight: 600; margin-bottom: 5px; font-size: 0.9em;' }
        });

        const tagsContainer = this.selectedStoriesContainer.createEl('div', {
            attr: { style: 'display: flex; flex-wrap: wrap; gap: 5px;' }
        });

        this.selectedStories.forEach(storyLink => {
            const tag = tagsContainer.createEl('div', {
                attr: {
                    style: 'color: #058239; font-weight: bold; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 4px; font-size: 0.9em;'
                }
            });

            // Extract basename from link format [[basename]]
            const basename = storyLink.replace(/\[\[|\]\]/g, '');
            tag.createEl('span', { text: basename });

            const removeBtn = tag.createEl('span', {
                text: '×',
                attr: {
                    style: 'cursor: pointer; font-weight: bold; font-size: 1.2em; line-height: 1; margin-left: 2px;'
                }
            });

            removeBtn.addEventListener('click', () => {
                this.removeStory(storyLink);
            });
        });
    }

    //Get the selected stories as an array of strings
    getSelectedStories(): string[] {
        if (!Array.isArray(this.selectedStories)) {
            this.selectedStories = [];
        }
        return this.selectedStories;
    }

    //Get the selected stories as a comma-separated string for metadata storage
    getSelectedStoriesAsMetadata(): string {
        if (!Array.isArray(this.selectedStories)) {
            this.selectedStories = [];
        }
        return this.selectedStories.join(", ");
    }

    //Set the selected stories from an array of strings
    setSelectedStories(stories: string[]): void {
        this.selectedStories = stories || []
        this.updateSelectedStoriesDisplay();
    }

    //Clear all selected stories
    clearSelectedStories(): void {
        this.selectedStories = [];
        this.updateSelectedStoriesDisplay();
    }
}