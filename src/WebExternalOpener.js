
export default class WebExternalOpener {
    constructor() {

    }

    spawnWorkspaceFromUrl(workspaceUrl) {
        let url = window.location.protocol + "//" + window.location.host + window.location.pathname;
        if(workspaceUrl) {
            url += "?url=" + workspaceUrl; 
        }
        this.openWebLink(url);
    }

    openWebLink(url) {
        window.open(url)
        //celar the reference back to this window
        window.opener = null;
    }
}