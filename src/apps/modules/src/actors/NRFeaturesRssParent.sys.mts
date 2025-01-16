export class NRFeaturesRssParent extends JSWindowActorParent {
    //多分いらない、使わなければ削除: callbackFunc: ((url: string) => void) | undefined;
    async receiveMessage(message: ReceiveMessageArgument) {
      switch (message.name) {
        case "FeatureRss:isRssSite" : {
          const d = message.data;
          console.log(d);
          Services.obs.notifyObservers(null,"nor@rss:show",JSON.stringify(d));
          break;
        }
        case "FeatureRss:removeRssButton" : {
          Services.obs.notifyObservers(null,"nor@rss:hide");
          break;
        }
      }
    }
  }