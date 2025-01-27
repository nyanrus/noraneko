export class NRFeaturesRssChild extends JSWindowActorChild {
    handleEvent(event) {
        //最初にRSSボタンを消す
                this.sendAsyncMessage("FeatureRss:removeRssButton");
        //RSSのデータが有れば表示
                if (this.document?.documentElement?.tagName === "rss" || this.document?.documentElement?.tagName === "rdf:RDF") {
                const url = this.document?.location?.href;
                this.sendAsyncMessage("FeatureRss:isRssSite", {href:url});
                }
        
                [...(this.document?.querySelectorAll<HTMLLinkElement>("link[rel=alternate]") ?? [])].forEach((e)=>{
                if (e.type === "application/atom+xml" || e.type === "application/rss+xml") {
                    this.sendAsyncMessage("FeatureRss:isRssSite", {title:e.title, href:e.href, type:e.type});
                }
                })
              return;
            }
}