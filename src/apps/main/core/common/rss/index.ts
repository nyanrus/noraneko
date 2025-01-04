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
import { createResource, createSignal } from "solid-js";
import { addI18nObserver } from "../../../i18n/config";
import { RSSAction } from "./rss";
import { parseXML } from "./xml-parser";
//URLの一時保管用変数
const [getCurrentURL,setCurrentURL] = createSignal("")
const [rssResult] = createResource(getCurrentURL, fetchRSS);
 //URLのリスト、Prefへの置き換えを要検討 prefで配列使う方法は?
 let URLlist = [];
const [getRSSList,setRSSList] = createSignal(
  Services.prefs.getStringPref("noraneko.rssreader.list", ""),
);
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
  if(URLlist.indexOf(getCurrentURL()) == -1) {
    return false;
  }
  return true;
}
 //RSSリーダーに項目を追加、重複の場合はポップアップのボタンを削除に変更
 export function addRSSFeed() {
   if(URLlist.indexOf(getCurrentURL()) == -1) {
     URLlist.push(getCurrentURL());
     console.log(URLlist);
   } else {
     console.log("duplicate");
   }
   closePopup();
 }

 //初期化
 export function init() {
     console.log("[nor@rss] Init")
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
 async function fetchRSS() {
    console.log("run feed!")
    const res = await fetch(getCurrentURL());
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
