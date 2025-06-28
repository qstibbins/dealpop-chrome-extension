export class State {
  token: string | null = null;

  constructor() {
    chrome.storage.local.get(['token'], ({ token }) => {
      this.token = token ?? null;
    });
  }

  save() {
    chrome.storage.local.set({ token: this.token });
  }
} 