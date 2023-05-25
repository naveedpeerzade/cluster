import { timeoutExecute, debugGenerator, log } from './util';
import { inspect } from 'util';
const debug = debugGenerator('Worker');
const BROWSER_INSTANCE_TRIES = 10;
export default class Worker {
    cluster;
    args;
    id;
    browser;
    activeTarget = null;
    constructor({ cluster, args, id, browser }) {
        this.cluster = cluster;
        this.args = args;
        this.id = id;
        this.browser = browser;
        debug(`Starting #${this.id}`);
    }
    async handle(task, job, timeout) {
        this.activeTarget = job;
        let jobInstance = null;
        let page = null;
        let tries = 0;
        while (jobInstance === null) {
            try {
                jobInstance = await this.browser.jobInstance();
                page = jobInstance.resources.page;
            }
            catch (err) {
                debug(`Error getting browser page (try: ${tries}), message: ${err.message}`);
                await this.browser.repair();
                tries += 1;
                if (tries >= BROWSER_INSTANCE_TRIES) {
                    throw new Error('Unable to get browser page');
                }
            }
        }
        // We can be sure that page is set now, otherwise an exception would've been thrown
        page = page; // this is just for TypeScript
        let errorState = null;
        page.on('error', (err) => {
            errorState = err;
            log(`Error (page error) crawling ${inspect(job.data)} // message: ${err.message}`);
        });
        debug(`Executing task on worker #${this.id} with data: ${inspect(job.data)}`);
        let result;
        try {
            result = await timeoutExecute(timeout, task({
                page,
                // data might be undefined if queue is only called with a function
                // we ignore that case, as the user should use Cluster<undefined> in that case
                // to get correct typings
                data: job.data,
                worker: {
                    id: this.id,
                },
            }));
        }
        catch (err) {
            errorState = err;
            log(`Error crawling ${inspect(job.data)} // message: ${err.message}`);
        }
        debug(`Finished executing task on worker #${this.id}`);
        try {
            await jobInstance.close();
        }
        catch (e) {
            debug(`Error closing browser instance for ${inspect(job.data)}: ${e.message}`);
            await this.browser.repair();
        }
        this.activeTarget = null;
        if (errorState) {
            return {
                type: 'error',
                error: errorState || new Error('asf'),
            };
        }
        return {
            data: result,
            type: 'success',
        };
    }
    async close() {
        try {
            await this.browser.close();
        }
        catch (err) {
            debug(`Unable to close worker browser. Error message: ${err.message}`);
        }
        debug(`Closed #${this.id}`);
    }
}
