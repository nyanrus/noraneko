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
 import { render } from "@nora/solid-xul";
import { RSSAction } from "./rss";
//URLの一時保管用変数
 let currentURL = "";
 //URLのリスト、Prefへの置き換えを要検討
 let URLlist = [];
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
     };
     //ボタン、ポップアップ等のレンダリング
     render(RSSAction, document.getElementById("page-action-buttons")?.firstElementChild);
    //ボタンを隠す
     document?.getElementById("rssPageAction").setAttribute("hidden", true);
     //RSS対応ページなのでボタンを表示する
     Services.obs.addObserver((aSubject, aTopic, aData)=>{
     console.log("[nor@rss] Received:\n"+aData);
     document?.getElementById("rssPageAction")?.removeAttribute("hidden");
     currentURL = JSON.parse(aData).href;
     },"nor@rss:show");
     //RSS非対応ページなのでボタンを隠す
     Services.obs.addObserver((aSubject, aTopic, aData)=>{
       document?.getElementById("rssPageAction")?.setAttribute("hidden", true);
       },"nor@rss:hide");
     import.meta.hot?.accept((m) => {
       m?.init();
     });
 }
 //ポップアップを閉じる
 export function closePopup() {
   document.getElementById("rss-panel").hidePopup();
 }
 //RSSリーダーに項目を追加、重複の場合はポップアップのボタンを削除に変更
 export function addRSSFeed() {
   if(URLlist.indexOf(currentURL) == -1) {
     URLlist.push(currentURL);
     console.log(URLlist);
   } else {
     console.log("duplicate");
   }
 }
 //RSS情報の取得、間隔はユーザーが指定できるように
 function fetchRSS(url: string) {
     fetch(url).then((res) => res.text())
     .then((data) => {
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
                console.log(rssData);
                return rssData;
            }
            return null;
     })
     .catch(error => {
         console.error("[nor@rss] Err:\n"+error);
         return null;
     })
 }
 //RSSのパーサー(Thank you, NyanRus!)
 function parseXML(xml: string) {
   const parser = new DOMParser();
   const xmldoc = parser.parseFromString(xml,"text/xml");
 
   if (xmldoc.documentElement) {
     return {[xmldoc.documentElement.nodeName]:_parseXMLElement(xmldoc.documentElement)};
   } else {
     return null;
   }
 }
 
 function _parseXMLElement(elem: Element) {
   const attrList: Record<string,string> = {};
   if (elem.attributes) {
     for (let i = 0; i < elem.attributes.length; i++) {
       const attr = elem.attributes.item(i)!;
       attrList[attr.name] = attr.value;
     }
   }
   let ret: Record<string,object | string> = {}
   if (Object.keys(attrList).length !== 0) {
     ret = {...ret,$attr:attrList};
   }
   if (elem.children.length) {
     for (const child of elem.children) {
       if (Object.keys(ret).includes(child.nodeName)) {
         if (Array.isArray(ret[child.nodeName])) {
           ret[child.nodeName] = [...(ret[child.nodeName] as Array<unknown>),_parseXMLElement(child)];
         } else {
           ret[child.nodeName] = [ret[child.nodeName],_parseXMLElement(child)];
         }
       } else {
         ret[child.nodeName] = _parseXMLElement(child);
       }
     }
   } else {
     ret["$text"] = elem.textContent ?? "";
   }
   return ret;
 }