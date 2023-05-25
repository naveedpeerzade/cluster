import SingleBrowserImplementation from '../SingleBrowserImplementation';
export default class Page extends SingleBrowserImplementation {
    async createResources() {
        return {
            page: await this.browser.newPage(),
        };
    }
    async freeResources(resources) {
        await resources.page.close();
    }
}
