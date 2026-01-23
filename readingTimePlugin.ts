import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';

// Widget to display reading time at the end of paragraphs
class ReadingTimeWidget extends WidgetType {
	constructor(readonly wordCount: number, private readonly wordsPerMinute: number, private readonly showWords: boolean = false) {
		super();
	}

    // Create the DOM element for the widget
	toDOM() {
		const span = document.createElement('span');
		span.className = 'reading-time-display';
		span.style.marginLeft = '0.5em';
		span.style.color = 'var(--text-muted)';
		span.style.fontSize = '0.75em';
		span.style.opacity = '0.8';
		
		// Calculate reading time
		const totalSeconds = Math.ceil((this.wordCount / this.wordsPerMinute) * 60);
		
		let timeDisplay: string;
		if (totalSeconds < 60) {
			timeDisplay = `${totalSeconds}"`;
		} else {
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;
			timeDisplay = seconds > 0 ? `${minutes}'${seconds}"` : `${minutes} ''`;
		}
		
		if (this.showWords) {
			span.textContent = `${timeDisplay} ${this.wordCount}w`;
		} else {
			span.textContent = `${timeDisplay}`;
		}
		return span;
	}
}

// Widget to display section total reading time after headings
class SectionReadingTimeWidget extends WidgetType {
	constructor(readonly wordCount: number, private readonly wordsPerMinute: number, private readonly showWords: boolean = false) {
		super();
	}

    // Create the DOM element for the widget
	toDOM() {
		const span = document.createElement('span');
		span.className = 'section-reading-time-display';
		span.style.marginLeft = '0.5em';
		span.style.color = 'var(--text-muted)';
		span.style.fontSize = '0.75em';
		span.style.opacity = '1.0';
		
		// Calculate reading time
		const totalSeconds = Math.ceil((this.wordCount / this.wordsPerMinute) * 60);
		
		let timeDisplay: string;
		if (totalSeconds < 60) {
			timeDisplay = `${totalSeconds} sec at ${this.wordsPerMinute} wpm`;
		} else {
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;
			timeDisplay = seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min at ${this.wordsPerMinute} wpm`;
		}
		
		if (this.showWords) {
			span.textContent = `${timeDisplay} ${this.wordCount}w`;
		} else {
			span.textContent = `${timeDisplay}`;
		}
		return span;
		return span;
	}
}

export interface ReadingTimePluginOptions {
	wordsPerMinute?: number;
	getWordsPerMinute?: () => number;
	requiredFrontmatterType?: string;
}
// Main function to create the reading time plugin
export function createReadingTimePlugin(options?: ReadingTimePluginOptions) {
	const getWpm = options?.getWordsPerMinute || (() => options?.wordsPerMinute || 180);
	const requiredType = options?.requiredFrontmatterType || 'Script';
    
	return ViewPlugin.fromClass(class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

        // Update decorations on document or viewport changes
		update(update: ViewUpdate) {
			// Check if file has required type in frontmatter
			const text = update.state.doc.toString();
			const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
			
            // If frontmatter exists, check for required type
			if (frontmatterMatch) {
				const frontmatter = frontmatterMatch[1];
				const hasRequiredType = new RegExp(`type:\\s*${requiredType}`, 'i').test(frontmatter);
				
				if (!hasRequiredType) {
					this.decorations = Decoration.none;
					return;
				}
			} else {
				// No frontmatter, don't show decorations
				this.decorations = Decoration.none;
				return;
			}
			// Rebuild decorations if document changed or viewport changed
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

        // Build decorations for the entire document
		buildDecorations(view: EditorView): DecorationSet {
			// Get current WPM value
			const wpm = getWpm();
			
			// Check if file has required type in frontmatter
			const text = view.state.doc.toString();
			const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
			
			let showWords = false;
            // If frontmatter exists, check for required type
			if (frontmatterMatch) {
				const frontmatter = frontmatterMatch[1];
				const hasRequiredType = new RegExp(`type:\\s*${requiredType}`, 'i').test(frontmatter);
				
				if (!hasRequiredType) {
					return Decoration.none;
				}
				
				// Check for showWords property
				const showWordsMatch = frontmatter.match(/showWords:\s*(true|false)/i);
				if (showWordsMatch && showWordsMatch[1].toLowerCase() === 'true') {
					showWords = true;
				}
			} else {
				// No frontmatter, don't show decorations
				return Decoration.none;
			}
			
			// Remove frontmatter from text before processing
			let contentText = text;
			let contentStartPos = 0;
			if (frontmatterMatch) {
				const frontmatterEnd = frontmatterMatch[0].length;
				contentText = text.substring(frontmatterEnd);
				contentStartPos = frontmatterEnd;
			}
			
            //
			const decorations: Array<{pos: number, decoration: any}> = [];
			const lines = contentText.split('\n');
			
			let currentParagraph: string[] = [];
			let currentPos = contentStartPos;
			let currentSectionWords = 0;
			let currentHeadingPos = -1;

            // Process each line to find paragraphs and headings
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const lineLength = line.length;
				const trimmedLine = line.trim();
				
				// Check if line is a heading
				const isHeading = trimmedLine.startsWith('#');
				
				if (trimmedLine === '' || isHeading) {
					// End of paragraph - add decoration if we have content
					if (currentParagraph.length > 0) {
						const paragraphText = currentParagraph.join(' ');
						// Remove text within < and > and | and | before counting words
						const cleanedText = paragraphText.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '');
						const words = cleanedText.trim().split(/\s+/).filter(w => w.length > 0).length;
						
						if (words > 0) {
							// Add widget at the end of the last line of the paragraph
							const prevLineEndPos = currentPos - 1; // Position before the newline
							decorations.push({
								pos: prevLineEndPos,
								decoration: Decoration.widget({
									widget: new ReadingTimeWidget(words, wpm, showWords),
									side: 1
								})
							});
							
							// Add to section total
							currentSectionWords += words;
						}
						currentParagraph = [];
					}
					
					// If this is a heading, finish the previous section and start a new one
					if (isHeading) {
						// Add section total to previous heading if there is one
						if (currentHeadingPos >= 0 && currentSectionWords > 0) {
							decorations.push({
								pos: currentHeadingPos,
								decoration: Decoration.widget({
									widget: new SectionReadingTimeWidget(currentSectionWords, wpm, showWords),
									side: 1
								})
							});
						}
						
						// Start new section
						currentSectionWords = 0;
						currentHeadingPos = currentPos + lineLength;
					}
				} else {
					// Add line to current paragraph
					currentParagraph.push(line);
				}
				currentPos += lineLength + 1; // +1 for newline
			}
			
			// Handle last paragraph if it doesn't end with empty line
			if (currentParagraph.length > 0) {
				const paragraphText = currentParagraph.join(' ');
				// Remove text within < and > and | and | before counting words
				const cleanedText = paragraphText.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '');
				const words = cleanedText.trim().split(/\s+/).filter(w => w.length > 0).length;
				
				if (words > 0) {
					const docEnd = view.state.doc.length;
					decorations.push({
						pos: docEnd,
						decoration: Decoration.widget({
						widget: new ReadingTimeWidget(words, wpm, showWords),
						side: 1
					})
				});
				
				// Add to section total
				currentSectionWords += words;
			}
		}
		
		// Add final section total if there's a heading
		if (currentHeadingPos >= 0 && currentSectionWords > 0) {
			decorations.push({
				pos: currentHeadingPos,
				decoration: Decoration.widget({
					widget: new SectionReadingTimeWidget(currentSectionWords, wpm, showWords),
					side: 1
				})
			});
		}
		
		// Sort decorations by position before creating the set
		decorations.sort((a, b) => a.pos - b.pos);
		
		return Decoration.set(decorations.map(d => d.decoration.range(d.pos)));
	}
}, {
	decorations: v => v.decorations
});
}