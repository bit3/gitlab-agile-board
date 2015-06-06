module UI {
    export class Progress {
        progress: HTMLElement;
        progressBar: HTMLElement;

        constructor() {
            this.progress = document.createElement('div');
            this.progress.classList.add('progress');
            this.progress.style.visibility = 'hidden';

            this.progressBar = document.createElement('div');
            this.progressBar.classList.add('progress-bar');
            this.progressBar.classList.add('progress-bar-striped');
            this.progressBar.classList.add('progress-bar-danger');
            this.progressBar.classList.add('active');
            this.progressBar.style.width = '100%';
        }

        public getElement() {
            return this.progress;
        }

        public show(label: string) {
            this.progress.style.visibility = 'visible';
            this.progressBar.textContent = label;
        }

        public hide() {
            this.progress.style.visibility = 'hidden';
            this.progressBar.textContent = '';
        }

        public progress(label: string) {
            this.progressBar.textContent = label;
        }
    }
}
