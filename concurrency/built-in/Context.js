import SingleBrowserImplementation from '../SingleBrowserImplementation';
export default class Context extends SingleBrowserImplementation {
    async createResources() {
        const context = await this.browser
            .createIncognitoBrowserContext();
        const page = await context.newPage();
        return {
            context,
            page,
        };
    }
    async freeResources(resources) {
        await resources.context.close();
    }
}
