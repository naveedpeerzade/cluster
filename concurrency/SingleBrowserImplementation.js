import ConcurrencyImplementation from './ConcurrencyImplementation';
import { debugGenerator, timeoutExecute } from '../util';
const debug = debugGenerator('SingleBrowserImpl');
const BROWSER_TIMEOUT = 5000;
export default class SingleBrowserImplementation extends ConcurrencyImplementation {
    browser = null;
    repairing = false;
    repairRequested = false;
    openInstances = 0;
    waitingForRepairResolvers = [];
    constructor(options, puppeteer) {
        super(options, puppeteer);
    }
    async repair() {
        if (this.openInstances !== 0 || this.repairing) {
            // already repairing or there are still pages open? wait for start/finish
            await new Promise(resolve => this.waitingForRepairResolvers.push(resolve));
            return;
        }
        this.repairing = true;
        debug('Starting repair');
        try {
            // will probably fail, but just in case the repair was not necessary
            await this.browser.close();
        }
        catch (e) {
            debug('Unable to close browser.');
        }
        try {
            this.browser = await this.puppeteer.launch(this.options);
        }
        catch (err) {
            throw new Error('Unable to restart chrome.');
        }
        this.repairRequested = false;
        this.repairing = false;
        this.waitingForRepairResolvers.forEach(resolve => resolve());
        this.waitingForRepairResolvers = [];
    }
    async init() {
        this.browser = await this.puppeteer.launch(this.options);
    }
    async close() {
        await this.browser.close();
    }
    async workerInstance() {
        let resources;
        return {
            jobInstance: async () => {
                if (this.repairRequested) {
                    await this.repair();
                }
                await timeoutExecute(BROWSER_TIMEOUT, (async () => {
                    resources = await this.createResources();
                })());
                this.openInstances += 1;
                return {
                    resources,
                    close: async () => {
                        this.openInstances -= 1; // decrement first in case of error
                        await timeoutExecute(BROWSER_TIMEOUT, this.freeResources(resources));
                        if (this.repairRequested) {
                            await this.repair();
                        }
                    },
                };
            },
            close: async () => { },
            repair: async () => {
                debug('Repair requested');
                this.repairRequested = true;
                await this.repair();
            },
        };
    }
}
