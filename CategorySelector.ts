import { get } from "http";
import { DropdownComponent, Setting, App, TFile, Modal, TextComponent } from "obsidian";

export default class CategorySelector {
    private type: string;
    private onSelect: any = null;
    private app: App;
    private categories: string[];


    constructor(app: App, type: string, onSelect: any = null) {
        this.type = type;
        this.onSelect = onSelect;
        this.app = app;
        this.categories = this.getUniqueCategories()
    }

	private getUniqueCategories(): string[] {
		const files = this.app.vault.getMarkdownFiles();
		const categories = new Set<string>();
		
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type?.toLowerCase() === this.type.toLowerCase()) {
				const category = cache.frontmatter.Category || cache.frontmatter.category;
				if (category && typeof category === 'string') {
					categories.add(category);
				} else if (Array.isArray(category)) {
					// Handle case where category is an array
					category.forEach(cat => {
						if (typeof cat === 'string') {
							categories.add(cat);
						}
					});
				}
			}
		}
		return Array.from(categories).sort();
	}

    renderCategorySelector(container: HTMLElement) {
        new Setting(container)
            .setName("Category")
            .setDesc("Select an existing category")
            .addDropdown((dropdown: DropdownComponent) => {
                const options = this.categories || []; 
                options.forEach((opt) => dropdown.addOption(opt, opt));
                dropdown.setValue(options[0] || "");
                dropdown.onChange(this.onSelect);
                this.onSelect(options[0])
            })
    }

    renderNewCategoryInput(container: HTMLElement) {
        const categories = this.getUniqueCategories();
        new Setting(container)
            .setName("New Category")
            .setDesc("Create a new category")
            .addText((text: TextComponent) => {
                text.setPlaceholder("Enter category name");
                text.onChange(this.onSelect);
            });
    }
}