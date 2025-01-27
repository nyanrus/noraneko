/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 //要修正
 /*
 機能:
 ポップアップを閉じる
 Prefに登録する
 重複をチェックする
 定期取得する
 */

 import { createRootHMR, render } from "@nora/solid-xul";
import i18next from "i18next";
import { Accessor, Resource, Setter, createEffect, createResource, createSignal } from "solid-js";
import { addI18nObserver } from "../../../i18n/config";
import { RSSAction } from "./rss";
import { parseXML } from "./xml-parser";

function createConfig() : [Accessor<string[]>,Setter<string[]>,Accessor<string>,Setter<string>,Resource<{}|null>,(info?: unknown) => {} | Promise<{} | null | undefined> | null | undefined]{
  const [getURLList,setURLList] = createSignal(
    JSON.parse(Services.prefs.getStringPref("noraneko.rss.list", "[]"))
  );
  const [getCurrentURL,setCurrentURL] = createSignal("")
  const [rssResult, {refetch}] = createResource(getCurrentURL, fetchRSS);
  //念の為名前変更
  const RSSRefetch = refetch;
  createEffect(() => {
    Services.prefs.setStringPref(
      "noraneko.rss.list",
      JSON.stringify(getURLList()),
    );
  });
  return [getURLList,setURLList,getCurrentURL,setCurrentURL,rssResult,RSSRefetch];
}

export const [getURLList,setURLList,getCurrentURL,setCurrentURL,rssResult,RSSRefetch] = createRootHMR(createConfig,import.meta.hot)

//ポップアップを閉じる
export function closePopup() {
  document.getElementById("rss-panel").hidePopup();
}

export function onPopup() {
  const title = document?.getElementById("rss-content-label");
  const subscribeButton = document?.getElementById("rss-subscribe-button");
  const channelTitle = Object.keys(rssResult())[0];
  createRootHMR(
    () => {
      addI18nObserver((locale) => {
        title.value = i18next.t("rss-url.label", {
          lng: locale,
          url: channelTitle,
          ns: "rss"
        });
        if(existRSSFeed()) {
          subscribeButton.label = i18next.t("unsubscribe.label", {
            lng: locale,
            ns: "rss"
          });
        } else {
          subscribeButton.label = i18next.t("subscribe.label", {
            lng: locale,
            ns: "rss"
          });
        }
      });
    },
    import.meta.hot,
  );
}

function existRSSFeed() {
  if(getURLList().indexOf(getCurrentURL()) == -1) {
    return false;
  }
  return true;
}
 //RSSリーダーに項目を追加、重複の場合はポップアップのボタンを削除に変更
 export function addRSSFeed() {
  const prev = getURLList();
   const index = prev.indexOf(getCurrentURL());
   if(index == -1) {
     setURLList([...prev,getCurrentURL()]);
   } else {
    prev.splice(index,1);
    setURLList([...prev]);
   }
   closePopup();
 }

 //初期化
 export function init() {
     console.log("[nor@rss] Init")
     //一定期間でURLリストを渡して更新
     setInterval(() => {
      RSSRefetch({value: getURLList()});
      console.log(rssResult());
     },10000);
     //window.gFloorp.rssReaderへの関数登録
     if (!window.gFloorp) {
       window.gFloorp = {};
     }
     window.gFloorp.rssReader = {
       closePopup: this.closePopup,
       addRSSFeed: this.addRSSFeed,
       onPopup: this.onPopup,
     };
     //ボタン、ポップアップ等のレンダリング
     if(document?.getElementById("rssPageAction") !== null) {
      document?.getElementById("rssPageAction")?.remove();
     }
     render(RSSAction, document.getElementById("page-action-buttons")?.firstElementChild);
    //ボタンを隠す
     document?.getElementById("rssPageAction").setAttribute("hidden", true);
     //RSS対応ページなのでボタンを表示する
     Services.obs.addObserver((aSubject, aTopic, aData)=>{
     console.log("[nor@rss] Received:\n"+aData);
     document?.getElementById("rssPageAction")?.removeAttribute("hidden");
     setCurrentURL(JSON.parse(aData).href);
     },"nor@rss:show");
     //RSS非対応ページなのでボタンを隠す
     Services.obs.addObserver((aSubject, aTopic, aData)=>{
       document?.getElementById("rssPageAction")?.setAttribute("hidden", true);
       },"nor@rss:hide");
     import.meta.hot?.accept((m) => {
       m?.init();
     });
 }


 //RSS情報の取得、間隔はユーザーが指定できるように
 async function fetchRSS({value: url = getCurrentURL()}) {
    console.log("run feed!")
    console.log(url);
    if(Array.isArray(url)) {
      console.log("isArray");
      return null;
    }
    const res = await fetch(url);
    const data = await res.text();
    const parseData = parseXML(data);
    if(parseData != null) {
        console.log(parseData);
        const rssKey = Object.keys(parseData)[0];
        const rssTitle = parseData[rssKey]["channel"]["title"]["$text"];
        let rssData = {};
        rssData[rssTitle] = {};
        switch(rssKey) {
            case "rdf:RDF":
                parseData[rssKey]["item"].forEach(itemData => {
                    rssData[rssTitle][itemData["title"]["$text"]] = {};
                    rssData[rssTitle][itemData["title"]["$text"]]["link"] = itemData["link"]["$text"];
                    rssData[rssTitle][itemData["title"]["$text"]]["date"] = itemData["dc:date"]["$text"];
                });
                break;
            case "rss":
              parseData[rssKey]["channel"]["item"].forEach(itemData => {
                rssData[rssTitle][itemData["title"]["$text"]] = {};
                rssData[rssTitle][itemData["title"]["$text"]]["link"] = itemData["link"]["$text"];
                rssData[rssTitle][itemData["title"]["$text"]]["date"] = itemData[itemData["pubDate"] == undefined ? "dc:date" : "pubDate"]["$text"];
              });
                break;
        }
        console.log(Object.keys(rssData)[0]);
        return rssData;
    }
    return null;
 }
