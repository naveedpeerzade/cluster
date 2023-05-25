import { URL } from 'url';
export default class Job {
    data;
    taskFunction;
    executeCallbacks;
    lastError = null;
    tries = 0;
    constructor(data, taskFunction, executeCallbacks) {
        this.data = data;
        this.taskFunction = taskFunction;
        this.executeCallbacks = executeCallbacks;
    }
    getUrl() {
        if (!this.data) {
            return undefined;
        }
        if (typeof this.data === 'string') {
            return this.data;
        }
        if (typeof this.data.url === 'string') {
            return this.data.url;
        }
        return undefined;
    }
    getDomain() {
        // TODO use tld.js to restrict to top-level domain?
        const urlStr = this.getUrl();
        if (urlStr) {
            try {
                const url = new URL(urlStr);
                return url.hostname || undefined;
            }
            catch (e) {
                // if urlStr is not a valid URL this might throw
                // but we leave this to the user
                return undefined;
            }
        }
        return undefined;
    }
    addError(error) {
        this.tries += 1;
        this.lastError = error;
    }
}
