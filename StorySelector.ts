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
    private onSelect: any;
    private storyTextComponent: TextComponent | null = null;
    private suggestionsContainer: HTMLElement | null = null;

    constructor(app: App, onSelect: (file: TFile) => string) {
        super(app);
        this.onSelect = onSelect;
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

    getItems(): TFile[] {
        return this.getStoryNotes();
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    onChooseItem(item: TFile): void {
        this.onSelect(item);
    }

    //Render the story suggestions and recent stories UI
    render(container: HTMLElement): void {
        const stories = this.getStoryNotes();
        this.renderStoryTextBox(container, stories);
    }

    /**
     * Renders a text box with auto-complete suggestions for story titles
     */
    renderStoryTextBox(container: HTMLElement, stories: TFile[]): TextComponent {
        const onStorySelect = this.onSelect;
        let selectedStory: TFile | null = null;

        const setting = new Setting(container)
            .setName("Story")
            .setDesc("Type to search for a story")
            .addText((text: TextComponent) => {
                // Store reference to text component
                this.storyTextComponent = text;
                
                // Create suggestions container
                this.suggestionsContainer = container.createEl("div", {
                    cls: "story-suggestions",
                    attr: { style: "display: none; border: 1px solid var(--background-modifier-border); max-height: 200px; overflow-y: auto; z-index: 1000; background: var(--background-primary);" }
                });

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
                    style: "padding: 8px; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border);" 
                }
            });

            suggestionEl.addEventListener('hover', () => {
                suggestionEl.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            suggestionEl.addEventListener('mouseleave', () => {
                suggestionEl.style.backgroundColor = '';
            });

            suggestionEl.addEventListener('click', () => {
                textComponent.setValue(story.basename);
                container.style.display = 'none';
                onStorySelect?.(story);
            });
        });
    }

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
                    this.storyTextComponent.setValue(story.basename);
                }
                this.onSelect(story);
            });
        });
    }

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
}