export class State {
    constructor() {
        this.token = null;
        chrome.storage.local.get(['token'], ({ token }) => {
            this.token = token ?? null;
        });
    }
    save() {
        chrome.storage.local.set({ token: this.token });
    }
}
