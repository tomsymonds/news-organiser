export default class DurationCounter {

    public hit: HTMLElement | null = null;
    public docPath: string;
    public secondsCount: number = 0;
    public totalSecondsEl: HTMLElement | null = null;

    constructor(docPath: string) {    
        this.docPath = docPath
    }   
    
    addHit(element: HTMLElement){
        this.hit = element;
        this.secondsCount = 0;
    }

    addDurationToHit(duration: number){
        console.log("Adding duration:", duration);
        this.secondsCount += duration;
        this.updateDurationTotalEl();
    }

    private updateDurationTotalEl(){
        const durationDisplay = (seconds: number) => {
            const minutesPart = Math.floor(seconds / 60);
            const secondsPart = seconds % 60;
            if (minutesPart > 0) {
                return `⏱️ ${minutesPart}m ${secondsPart}s`;
            } else {
                return `⏱️ ${secondsPart}s`;
            }
		}
        if(this.hit){
            console.log("Updating total duration element");
            if(this.totalSecondsEl){
                console.log("Total seconds element exists, updating text");
                this.totalSecondsEl.setText(durationDisplay(this.secondsCount));
            }
        }
    }

    reset(docPath: string){
        console.log("Resetting DurationCounter for docPath:", docPath);
        this.hit = null
        this.secondsCount = 0
        this.docPath = docPath;
    }
}